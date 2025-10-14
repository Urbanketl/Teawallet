import { Request, Response } from 'express';
import { challengeResponseService } from '../services/challengeResponseService';
import { storage } from '../storage';
import { z } from 'zod';

// Challenge-Response Authentication Controller for MIFARE DESFire EV1
export class ChallengeResponseController {

  // Machine requests challenge for card authentication
  async generateChallenge(req: Request, res: Response) {
    try {
      const { machineId, cardUid } = req.body;
      
      if (!machineId || !cardUid) {
        return res.status(400).json({ 
          error: 'Machine ID and card UID are required' 
        });
      }

      // Verify machine exists and is active
      const machine = await storage.getTeaMachine(machineId);
      if (!machine || !machine.isActive) {
        return res.status(404).json({ error: 'Machine not found or inactive' });
      }

      const challengeResult = await challengeResponseService.generateChallenge(
        machineId, 
        cardUid
      );

      res.json({
        success: true,
        challengeId: challengeResult.challengeId,
        challenge: challengeResult.challenge,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Challenge generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate challenge',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Validate challenge response and authenticate card
  async validateResponse(req: Request, res: Response) {
    try {
      const { challengeId, response, cardUid } = req.body;
      
      if (!challengeId || !response || !cardUid) {
        return res.status(400).json({ 
          error: 'Challenge ID, response, and card UID are required' 
        });
      }

      const authResult = await challengeResponseService.validateChallengeResponse(
        challengeId,
        response,
        cardUid
      );

      if (authResult.success) {
        // Get business unit balance for transaction authorization
        const businessUnit = await storage.getBusinessUnit(authResult.businessUnitId!);
        
        res.json({
          success: true,
          authenticated: true,
          cardNumber: authResult.cardNumber,
          businessUnitId: authResult.businessUnitId,
          businessUnitName: businessUnit?.name,
          walletBalance: businessUnit?.walletBalance,
          challengeData: authResult.challengeData,
          message: 'Authentication successful'
        });
      } else {
        res.status(401).json({
          success: false,
          authenticated: false,
          error: authResult.errorMessage,
          message: 'Authentication failed'
        });
      }

    } catch (error) {
      console.error('Response validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate response',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Process tea dispensing after successful authentication
  async processDispensing(req: Request, res: Response) {
    try {
      const { 
        machineId, 
        cardNumber, 
        businessUnitId, 
        amount, 
        quantity = 1 
      } = req.body;

      // Validate required parameters
      if (!machineId || !cardNumber || !businessUnitId || !amount) {
        return res.status(400).json({ 
          error: 'Machine ID, card number, business unit ID, and amount are required' 
        });
      }

      // Process the transaction
      const result = await storage.processRfidTransactionForBusinessUnit({
        businessUnitId,
        cardNumber,
        machineId,
        amount: parseFloat(amount),
        quantity
      });

      if (result.success) {
        res.json({
          success: true,
          transaction: result.transaction,
          newBalance: result.newBalance,
          dispensingLog: result.dispensingLog,
          message: `Tea dispensed successfully. Remaining balance: ₹${result.newBalance}`
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: result.error || 'Transaction failed'
        });
      }

    } catch (error) {
      console.error('Dispensing processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process dispensing',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get authentication logs for monitoring
  async getAuthLogs(req: Request, res: Response) {
    try {
      const { machineId, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT 
          mal.id,
          mal.machine_id,
          tm.name as machine_name,
          mal.rfid_card_id,
          mal.auth_status,
          mal.challenge_sent,
          mal.response_received,
          mal.error_message,
          mal.created_at
        FROM machine_auth_logs mal
        LEFT JOIN tea_machines tm ON mal.machine_id = tm.id
      `;

      const params: any[] = [];
      if (machineId) {
        query += ` WHERE mal.machine_id = $1`;
        params.push(machineId);
      }

      query += ` ORDER BY mal.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const authLogs = await storage.executeQuery(query, params);

      res.json({
        success: true,
        logs: authLogs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: authLogs.length
        }
      });

    } catch (error) {
      console.error('Get auth logs error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve authentication logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get service status and statistics
  async getServiceStatus(req: Request, res: Response) {
    try {
      const status = challengeResponseService.getServiceStatus();
      
      res.json({
        success: true,
        service: 'ChallengeResponseService',
        status: {
          ...status,
          version: '1.0.0',
          features: [
            'MIFARE DESFire EV1 Support',
            'AES Challenge-Response Authentication',
            'Automatic Key Rotation',
            'Security Audit Logging'
          ]
        }
      });

    } catch (error) {
      console.error('Service status error:', error);
      res.status(500).json({ 
        error: 'Failed to get service status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}