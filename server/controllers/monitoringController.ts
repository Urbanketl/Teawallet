import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Monitoring controller for authentication logs and machine heartbeat
export class MonitoringController {
  
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
        })
      });

      const data = machineHeartbeatSchema.parse(req.body);
      
      // Update machine ping
      await storage.updateMachinePing(data.machineId);

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

export const monitoringController = new MonitoringController();
