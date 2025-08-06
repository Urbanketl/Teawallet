import { Request, Response } from 'express';
import { storage } from '../storage';

export class MachineController {
  
  // Validate RFID card and check balance
  static async validateCard(req: Request, res: Response) {
    try {
      const { cardId, machineId } = req.body;
      
      if (!cardId || !machineId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing cardId or machineId' 
        });
      }

      // Get RFID card details
      const card = await storage.getRfidCardByNumber(cardId);
      
      if (!card || !card.isActive) {
        return res.status(200).json({
          valid: false,
          message: 'Invalid or inactive card'
        });
      }

      // Get business unit details and balance
      const businessUnit = await storage.getBusinessUnit(card.businessUnitId);
      
      if (!businessUnit) {
        return res.status(200).json({
          valid: false,
          message: 'Business unit not found'
        });
      }

      // Check if machine belongs to the business unit
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(200).json({
          valid: false,
          message: 'Machine not found'
        });
      }

      if (machine.businessUnitId !== card.businessUnitId) {
        return res.status(200).json({
          valid: false,
          message: 'Card not valid for this machine'
        });
      }

      const balance = parseFloat(businessUnit.walletBalance || '0');
      
      return res.status(200).json({
        valid: true,
        cardId: card.cardNumber,
        businessUnitId: card.businessUnitId,
        businessUnitName: businessUnit.name,
        balance: balance,
        machineId: machineId,
        machineName: machine.name
      });

    } catch (error) {
      console.error('RFID validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during validation'
      });
    }
  }

  // Process tea dispensing and log transaction
  static async processDispensing(req: Request, res: Response) {
    try {
      const { cardId, machineId, businessUnitId, amount, timestamp, teaType } = req.body;
      
      if (!cardId || !machineId || !businessUnitId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Get business unit and check balance
      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      
      if (!businessUnit) {
        return res.status(400).json({
          success: false,
          message: 'Business unit not found'
        });
      }

      const currentBalance = parseFloat(businessUnit.walletBalance || '0');
      const dispensingAmount = parseFloat(amount.toString());
      
      if (currentBalance < dispensingAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Get RFID card
      const card = await storage.getRfidCardByNumber(cardId);
      
      if (!card || !card.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid card'
        });
      }

      // Get machine details
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(400).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Create dispensing log
      const dispensingLog = await storage.createDispensingLog({
        cardId: card.id,
        machineId: machineId,
        teaType: teaType || 'Regular Tea',
        amount: dispensingAmount.toString(),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        businessUnitId: businessUnitId
      });

      // Deduct amount from business unit wallet
      const newBalance = currentBalance - dispensingAmount;
      await storage.updateBusinessUnitBalance(businessUnitId, newBalance.toString());

      // Log successful dispensing
      console.log(`Tea dispensed: ${teaType || 'Regular Tea'} for ₹${dispensingAmount} from machine ${machineId}`);

      return res.status(200).json({
        success: true,
        transactionId: dispensingLog.id,
        newBalance: newBalance,
        message: 'Dispensing successful'
      });

    } catch (error) {
      console.error('Dispensing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during dispensing'
      });
    }
  }

  // Handle machine heartbeat
  static async handleHeartbeat(req: Request, res: Response) {
    try {
      const { machineId, status, dailyDispensed, totalDispensed, timestamp } = req.body;
      
      if (!machineId) {
        return res.status(400).json({
          success: false,
          message: 'Machine ID required'
        });
      }

      // Update machine status
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Update machine last seen and status
      await storage.updateTeaMachine(machineId, {
        lastSeen: timestamp ? new Date(timestamp) : new Date(),
        status: status || 'online',
        isOnline: status === 'online'
      });

      // Log heartbeat
      console.log(`Heartbeat from ${machineId}: ${status}, dispensed today: ${dailyDispensed}`);

      return res.status(200).json({
        success: true,
        machineId: machineId,
        serverTime: new Date().toISOString(),
        message: 'Heartbeat received'
      });

    } catch (error) {
      console.error('Heartbeat error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error processing heartbeat'
      });
    }
  }

  // Get machine configuration
  static async getMachineConfig(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      
      const machine = await storage.getTeaMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      // Get business unit details
      const businessUnit = await storage.getBusinessUnit(machine.businessUnitId);

      return res.status(200).json({
        success: true,
        machine: {
          id: machine.id,
          name: machine.name,
          location: machine.location,
          teaPrice: machine.teaPrice || '5.00',
          businessUnit: businessUnit ? {
            id: businessUnit.id,
            name: businessUnit.name
          } : null
        }
      });

    } catch (error) {
      console.error('Machine config error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching machine config'
      });
    }
  }
}