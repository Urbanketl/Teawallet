import * as cron from 'node-cron';
import { storage } from '../storage';
import { db } from '../db';
import { teaMachines, machineSyncLogs } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

interface SyncConfiguration {
  enabled: boolean;
  interval: string; // cron expression
  maxRetries: number;
  retryDelay: number; // minutes
  syncWindow: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

class AutoSyncService {
  private syncTasks: Map<string, cron.ScheduledTask> = new Map();
  private syncInProgress: Set<string> = new Set();
  private defaultConfig: SyncConfiguration = {
    enabled: true,
    interval: '0 */30 * * * *', // Every 30 minutes
    maxRetries: 3,
    retryDelay: 5,
    syncWindow: {
      start: '06:00',
      end: '22:00'
    }
  };

  constructor() {
    console.log('AutoSyncService initialized');
  }

  async startAutoSync() {
    console.log('Starting auto-sync scheduler...');
    
    // Schedule periodic sync for all active machines
    const globalSyncTask = cron.schedule(this.defaultConfig.interval, async () => {
      await this.performGlobalSync();
    }, {
      timezone: 'Asia/Kolkata'
    });

    this.syncTasks.set('global', globalSyncTask);

    // Schedule retry mechanism for failed syncs
    const retryTask = cron.schedule('0 */5 * * * *', async () => {
      await this.retryFailedSyncs();
    }, {
      timezone: 'Asia/Kolkata'
    });

    this.syncTasks.set('retry', retryTask);

    console.log('Auto-sync scheduler started successfully');
  }

  async stopAutoSync() {
    console.log('Stopping auto-sync scheduler...');
    
    for (const [taskId, task] of Array.from(this.syncTasks.entries())) {
      task.destroy();
      console.log(`Stopped sync task: ${taskId}`);
    }
    
    this.syncTasks.clear();
    this.syncInProgress.clear();
  }

  async performGlobalSync(): Promise<void> {
    if (!this.isWithinSyncWindow()) {
      console.log('Outside sync window, skipping global sync');
      return;
    }

    console.log('Starting global auto-sync...');
    
    try {
      // Get all active machines
      const machines = await db
        .select()
        .from(teaMachines)
        .where(eq(teaMachines.isActive, true));

      const syncPromises = machines
        .filter(machine => !this.syncInProgress.has(machine.id))
        .map(machine => this.syncMachine(machine.id, 'auto'));

      const results = await Promise.allSettled(syncPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Global sync completed: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('Global sync error:', error);
    }
  }

  async syncMachine(machineId: string, syncType: 'auto' | 'manual' = 'auto'): Promise<void> {
    if (this.syncInProgress.has(machineId)) {
      console.log(`Sync already in progress for machine ${machineId}`);
      return;
    }

    this.syncInProgress.add(machineId);
    
    try {
      console.log(`Starting ${syncType} sync for machine ${machineId}`);
      
      // Get machine details
      const machine = await storage.getTeaMachine(machineId);
      if (!machine) {
        throw new Error(`Machine ${machineId} not found`);
      }

      // Get RFID cards for this machine's business unit
      const cards = await storage.getAllRfidCards();
      const businessUnitCards = cards.filter(card => card.businessUnitId === machine.businessUnitId);
      
      // Simulate sync process with the machine
      const syncStartTime = new Date();
      const syncResult = await this.performMachineSync(machine, businessUnitCards);
      const syncEndTime = new Date();
      
      // Update machine sync status
      await db
        .update(teaMachines)
        .set({
          syncStatus: syncResult.success ? 'synced' : 'failed',
          lastSync: syncEndTime
        })
        .where(eq(teaMachines.id, machineId));

      // Log sync operation
      await db.insert(machineSyncLogs).values({
        machineId,
        syncType,
        syncStatus: syncResult.success ? 'completed' : 'failed',
        dataPushed: syncResult.dataPushed,
        errorMessage: syncResult.error,
        responseTime: syncEndTime.getTime() - syncStartTime.getTime(),
        cardsUpdated: syncResult.cardsUpdated
      });

      console.log(`${syncType} sync completed for machine ${machineId}: ${syncResult.success ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error) {
      console.error(`Sync failed for machine ${machineId}:`, error);
      
      // Log failed sync
      await db.insert(machineSyncLogs).values({
        machineId,
        syncType,
        syncStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        cardsUpdated: 0
      });
      
    } finally {
      this.syncInProgress.delete(machineId);
    }
  }

  private async performMachineSync(machine: any, cards: any[]): Promise<{
    success: boolean;
    cardsUpdated: number;
    dataPushed: any;
    error?: string;
  }> {
    // Simulate machine communication
    // In production, this would make HTTP requests to actual tea machines
    
    const syncData = {
      machineId: machine.id,
      timestamp: new Date().toISOString(),
      cards: cards.map(card => ({
        cardNumber: card.cardNumber,
        hardwareUid: card.hardwareUid,
        aesKey: card.aesKeyEncrypted,
        keyVersion: card.keyVersion,
        isActive: card.isActive
      })),
      configuration: {
        price: machine.price,
        businessUnitId: machine.businessUnitId
      }
    };

    // Simulate network delay and potential failures
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // 95% success rate for simulation
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        cardsUpdated: cards.length,
        dataPushed: syncData
      };
    } else {
      return {
        success: false,
        cardsUpdated: 0,
        dataPushed: null,
        error: 'Network timeout or machine unavailable'
      };
    }
  }

  private async retryFailedSyncs(): Promise<void> {
    console.log('Checking for failed syncs to retry...');
    
    try {
      // Get recent failed syncs that haven't exceeded retry limit
      const failedSyncs = await db
        .select()
        .from(machineSyncLogs)
        .where(
          and(
            eq(machineSyncLogs.syncStatus, 'failed'),
            lt(machineSyncLogs.createdAt, new Date(Date.now() - this.defaultConfig.retryDelay * 60 * 1000))
          )
        )
        .limit(10);

      for (const syncLog of failedSyncs) {
        if (!this.syncInProgress.has(syncLog.machineId)) {
          console.log(`Retrying sync for machine ${syncLog.machineId}`);
          await this.syncMachine(syncLog.machineId, 'auto');
        }
      }
      
    } catch (error) {
      console.error('Error during retry process:', error);
    }
  }

  private isWithinSyncWindow(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.defaultConfig.syncWindow.start.split(':').map(Number);
    const [endHour, endMin] = this.defaultConfig.syncWindow.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  // Public API methods
  async triggerMachineSync(machineId: string): Promise<void> {
    return this.syncMachine(machineId, 'manual');
  }

  async triggerBulkSync(): Promise<{ synced: number; failed: number }> {
    console.log('Starting manual bulk sync...');
    
    const machines = await db
      .select()
      .from(teaMachines)
      .where(eq(teaMachines.isActive, true));

    const results = await Promise.allSettled(
      machines.map(machine => this.syncMachine(machine.id, 'manual'))
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Bulk sync completed: ${synced} synced, ${failed} failed`);
    
    return { synced, failed };
  }

  getSyncStatus(): {
    isRunning: boolean;
    activeTasks: string[];
    syncInProgress: string[];
  } {
    return {
      isRunning: this.syncTasks.size > 0,
      activeTasks: Array.from(this.syncTasks.keys()),
      syncInProgress: Array.from(this.syncInProgress)
    };
  }
}

export const autoSyncService = new AutoSyncService();