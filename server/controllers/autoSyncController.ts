import { Request, Response } from 'express';
import { autoSyncService } from '../services/autoSyncService';
import { storage } from '../storage';

// Auto-Sync System Controller for Phase 3
export class AutoSyncController {

  // Start the auto-sync service
  async startAutoSync(req: Request, res: Response) {
    try {
      await autoSyncService.startAutoSync();
      
      res.json({
        success: true,
        message: 'Auto-sync service started successfully',
        status: autoSyncService.getSyncStatus()
      });

    } catch (error) {
      console.error('Start auto-sync error:', error);
      res.status(500).json({ 
        error: 'Failed to start auto-sync service',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Stop the auto-sync service
  async stopAutoSync(req: Request, res: Response) {
    try {
      await autoSyncService.stopAutoSync();
      
      res.json({
        success: true,
        message: 'Auto-sync service stopped successfully',
        status: autoSyncService.getSyncStatus()
      });

    } catch (error) {
      console.error('Stop auto-sync error:', error);
      res.status(500).json({ 
        error: 'Failed to stop auto-sync service',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get auto-sync service status
  async getSyncStatus(req: Request, res: Response) {
    try {
      const status = autoSyncService.getSyncStatus();
      
      res.json({
        success: true,
        status,
        message: status.isRunning ? 'Auto-sync service is running' : 'Auto-sync service is stopped'
      });

    } catch (error) {
      console.error('Get sync status error:', error);
      res.status(500).json({ 
        error: 'Failed to get sync status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Trigger manual sync for specific machine
  async triggerMachineSync(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      
      if (!machineId) {
        return res.status(400).json({ error: 'Machine ID is required' });
      }

      // Verify machine exists
      const machine = await storage.getTeaMachine(machineId);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      await autoSyncService.triggerMachineSync(machineId);

      res.json({
        success: true,
        message: `Manual sync triggered for machine ${machine.name}`,
        machineId
      });

    } catch (error) {
      console.error('Trigger machine sync error:', error);
      res.status(500).json({ 
        error: 'Failed to trigger machine sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Trigger bulk sync for all active machines
  async triggerBulkSync(req: Request, res: Response) {
    try {
      const result = await autoSyncService.triggerBulkSync();

      res.json({
        success: true,
        message: 'Bulk sync completed',
        results: result
      });

    } catch (error) {
      console.error('Trigger bulk sync error:', error);
      res.status(500).json({ 
        error: 'Failed to trigger bulk sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get sync logs with filtering
  async getSyncLogs(req: Request, res: Response) {
    try {
      const { 
        machineId, 
        syncType, 
        status, 
        limit = 50, 
        offset = 0 
      } = req.query;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (machineId) {
        whereConditions.push(`msl.machine_id = $${params.length + 1}`);
        params.push(machineId);
      }

      if (syncType) {
        whereConditions.push(`msl.sync_type = $${params.length + 1}`);
        params.push(syncType);
      }

      if (status) {
        whereConditions.push(`msl.sync_status = $${params.length + 1}`);
        params.push(status);
      }

      let query = `
        SELECT 
          msl.id,
          msl.machine_id,
          tm.name as machine_name,
          tm.location as machine_location,
          msl.sync_type,
          msl.sync_status,
          msl.data_pushed,
          msl.error_message,
          msl.response_time,
          msl.cards_updated,
          msl.created_at
        FROM machine_sync_logs msl
        LEFT JOIN tea_machines tm ON msl.machine_id = tm.id
      `;

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ` ORDER BY msl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const syncLogs = await storage.executeQuery(query, params);

      res.json({
        success: true,
        logs: syncLogs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: syncLogs.length
        },
        filters: {
          machineId,
          syncType,
          status
        }
      });

    } catch (error) {
      console.error('Get sync logs error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve sync logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get sync statistics and metrics
  async getSyncStats(req: Request, res: Response) {
    try {
      const { timeframe = '24h' } = req.query;
      
      let timeCondition = '';
      switch (timeframe) {
        case '1h':
          timeCondition = "WHERE msl.created_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeCondition = "WHERE msl.created_at >= NOW() - INTERVAL '1 day'";
          break;
        case '7d':
          timeCondition = "WHERE msl.created_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "WHERE msl.created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeCondition = "WHERE msl.created_at >= NOW() - INTERVAL '1 day'";
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN sync_status = 'completed' THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
          COUNT(CASE WHEN sync_type = 'auto' THEN 1 END) as auto_syncs,
          COUNT(CASE WHEN sync_type = 'manual' THEN 1 END) as manual_syncs,
          AVG(response_time) as avg_response_time,
          SUM(cards_updated) as total_cards_updated
        FROM machine_sync_logs msl
        ${timeCondition}
      `;

      const [stats] = await storage.executeQuery(statsQuery);

      // Get machine sync status
      const machineStatusQuery = `
        SELECT 
          tm.id,
          tm.name,
          tm.location,
          tm.sync_status,
          tm.last_sync,
          COUNT(msl.id) as sync_count
        FROM tea_machines tm
        LEFT JOIN machine_sync_logs msl ON tm.id = msl.machine_id ${timeCondition.replace('WHERE', 'AND')}
        WHERE tm.is_active = true
        GROUP BY tm.id, tm.name, tm.location, tm.sync_status, tm.last_sync
        ORDER BY tm.name
      `;

      const machineStatus = await storage.executeQuery(machineStatusQuery);

      res.json({
        success: true,
        timeframe,
        statistics: {
          ...stats,
          success_rate: stats.total_syncs > 0 ? 
            ((stats.successful_syncs / stats.total_syncs) * 100).toFixed(2) + '%' : '0%'
        },
        machines: machineStatus,
        service_status: autoSyncService.getSyncStatus()
      });

    } catch (error) {
      console.error('Get sync stats error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve sync statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}