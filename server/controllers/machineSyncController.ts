import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Machine sync status and operations controller
export class MachineSyncController {
  
  // Get all machines with their sync status
  async getAllMachineStatus(req: Request, res: Response) {
    try {
      const machineStatuses = await storage.getAllMachineStatus();
      res.json(machineStatuses);
    } catch (error) {
      console.error('Error fetching machine statuses:', error);
      res.status(500).json({ error: 'Failed to fetch machine statuses' });
    }
  }

  // Get specific machine status
  async getMachineStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const machineStatus = await storage.getMachineStatus(machineId);
      
      if (!machineStatus) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      res.json(machineStatus);
    } catch (error) {
      console.error('Error fetching machine status:', error);
      res.status(500).json({ error: 'Failed to fetch machine status' });
    }
  }

  // Trigger card sync for a specific machine
  async syncMachineCards(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      if (!machine.businessUnitId) {
        return res.status(400).json({ error: 'Machine not assigned to business unit' });
      }

      // Get cards for this business unit
      const syncData = await storage.getCardsForMachineSync(machine.businessUnitId);
      
      // Log sync attempt
      await storage.createSyncLog({
        machineId,
        syncType: 'manual',
        dataPushed: syncData,
        syncStatus: 'success',
        cardsUpdated: syncData.cards.length
      });

      // Update machine sync status
      await storage.updateMachineSync(machineId, {
        syncStatus: 'synced',
        cardsCount: syncData.cards.length,
        lastSync: new Date()
      });

      res.json({
        success: true,
        message: `Synced ${syncData.cards.length} cards to ${machine.name}`,
        syncData
      });
    } catch (error) {
      console.error('Error syncing machine cards:', error);
      
      // Log failed sync
      const { machineId } = req.params;
      if (machineId) {
        await storage.createSyncLog({
          machineId,
          syncType: 'manual',
          syncStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          cardsUpdated: 0
        });
      }
      
      res.status(500).json({ error: 'Failed to sync machine cards' });
    }
  }

  // Bulk sync all machines
  async bulkSyncMachines(req: Request, res: Response) {
    try {
      const machines = await storage.getAllTeaMachines();
      const results = {
        total: 0,
        synced: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
      };

      for (const machine of machines) {
        results.total++;
        
        if (!machine.businessUnitId) {
          results.skipped++;
          results.details.push({
            machineId: machine.id,
            name: machine.name,
            status: 'skipped',
            reason: 'No business unit assigned'
          });
          continue;
        }

        try {
          const syncData = await storage.getCardsForMachineSync(machine.businessUnitId);
          
          await storage.createSyncLog({
            machineId: machine.id,
            syncType: 'bulk',
            dataPushed: syncData,
            syncStatus: 'success',
            cardsUpdated: syncData.cards.length
          });

          await storage.updateMachineSync(machine.id, {
            syncStatus: 'synced',
            cardsCount: syncData.cards.length,
            lastSync: new Date()
          });

          results.synced++;
          results.details.push({
            machineId: machine.id,
            name: machine.name,
            status: 'synced',
            cardsCount: syncData.cards.length
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            machineId: machine.id,
            name: machine.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          await storage.createSyncLog({
            machineId: machine.id,
            syncType: 'bulk',
            syncStatus: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            cardsUpdated: 0
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk sync completed: ${results.synced} synced, ${results.failed} failed, ${results.skipped} skipped`,
        results
      });
    } catch (error) {
      console.error('Error in bulk sync:', error);
      res.status(500).json({ error: 'Failed to perform bulk sync' });
    }
  }

  // Get sync logs for all machines or specific machine
  async getSyncLogs(req: Request, res: Response) {
    try {
      const { machineId } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;

      let logs;
      if (machineId && typeof machineId === 'string') {
        logs = await storage.getMachineSyncLogs(machineId, limit);
      } else {
        logs = await storage.getAllSyncLogs(limit);
      }

      res.json(logs);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      res.status(500).json({ error: 'Failed to fetch sync logs' });
    }
  }

  // Get RFID authentication logs
  async getAuthLogs(req: Request, res: Response) {
    try {
      const { machineId } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await storage.getRfidAuthLogs(
        machineId && typeof machineId === 'string' ? machineId : undefined, 
        limit
      );

      res.json(logs);
    } catch (error) {
      console.error('Error fetching auth logs:', error);
      res.status(500).json({ error: 'Failed to fetch authentication logs' });
    }
  }

  // Rotate keys for a business unit's DESFire cards
  async rotateKeys(req: Request, res: Response) {
    try {
      const { businessUnitId } = req.params;
      
      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (!businessUnit) {
        return res.status(404).json({ error: 'Business unit not found' });
      }

      const result = await storage.rotateCardKeys(businessUnitId);
      
      res.json({
        success: true,
        message: `Key rotation completed for ${businessUnit.name}: ${result.updated} cards updated`,
        ...result
      });
    } catch (error) {
      console.error('Error rotating keys:', error);
      res.status(500).json({ error: 'Failed to rotate keys' });
    }
  }

  // Machine heartbeat endpoint (for machines to report status)
  async heartbeat(req: Request, res: Response) {
    try {
      const machineHeartbeatSchema = z.object({
        machineId: z.string(),
        ipAddress: z.string().optional(),
        status: z.object({
          isOnline: z.boolean(),
          cardReaderStatus: z.string(),
          dispenserStatus: z.string(),
          temperature: z.number().optional(),
          waterLevel: z.number().optional()
        }),
        lastSync: z.string().optional(),
        cardsLoaded: z.number().optional()
      });

      const data = machineHeartbeatSchema.parse(req.body);
      
      // Update machine ping
      await storage.updateMachinePing(data.machineId);
      
      // Update additional sync data if provided
      if (data.lastSync || data.cardsLoaded !== undefined) {
        await storage.updateMachineSync(data.machineId, {
          syncStatus: data.status.isOnline ? 'synced' : 'failed',
          cardsCount: data.cardsLoaded || 0,
          lastSync: data.lastSync ? new Date(data.lastSync) : new Date(),
          ipAddress: data.ipAddress
        });
      }

      res.json({ 
        success: true, 
        message: 'Heartbeat received',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing heartbeat:', error);
      res.status(500).json({ error: 'Failed to process heartbeat' });
    }
  }
}

export const machineSyncController = new MachineSyncController();