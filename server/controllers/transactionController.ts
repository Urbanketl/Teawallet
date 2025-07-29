import { Request, Response } from "express";
import { storage } from "../storage";
import { insertTransactionSchema } from "@shared/schema";
import { createOrder, verifyPayment } from "../razorpay";

export async function getUserTransactions(req: any, res: Response) {
  try {
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    const transactions = await storage.getUserTransactions(userId);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

export async function createTransaction(req: any, res: Response) {
  try {
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    
    // Ensure business unit is captured for transactions
    let businessUnitId = req.body.businessUnitId;
    let machineId = req.body.machineId;
    
    // If machineId is provided but no businessUnitId, get it from machine
    if (machineId && !businessUnitId) {
      const machine = await storage.getTeaMachine(machineId);
      if (machine) {
        businessUnitId = machine.businessUnitId;
      }
    }
    
    // If still no business unit, get user's primary business unit for wallet transactions
    if (!businessUnitId && (req.body.type === 'recharge' || req.body.type === 'deduction')) {
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      if (userBusinessUnits.length > 0) {
        businessUnitId = userBusinessUnits[0].id; // Use first business unit as default
      }
    }
    
    const validated = insertTransactionSchema.parse({
      ...req.body,
      userId,
      businessUnitId,
      machineId,
    });

    const transaction = await storage.createTransaction(validated);
    
    // Check for low balance alert after transaction (business unit context)
    if (businessUnitId) {
      const businessUnit = await storage.getBusinessUnit(businessUnitId);
      if (businessUnit) {
        const lowBalanceThreshold = 50.00;
        const currentBalance = parseFloat(businessUnit.walletBalance || '0');
        if (currentBalance <= lowBalanceThreshold) {
          console.log(`Low balance alert for business unit ${businessUnit.name}: ₹${currentBalance}`);
          // Could send notification here
        }
      }
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Failed to create transaction" });
  }
}

export async function createPaymentOrder(req: any, res: Response) {
  try {
    const { amount, businessUnitId } = req.body;
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    
    console.log('=== CREATE PAYMENT ORDER ===');
    console.log('Amount:', amount);
    console.log('User ID:', userId);
    console.log('Request body:', req.body);
    
    if (!amount || amount <= 0) {
      console.log('Invalid amount, returning error');
      return res.status(400).json({ message: "Invalid amount" });
    }

    // If businessUnitId is provided, check business unit wallet limit instead of user wallet
    if (businessUnitId) {
      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ message: "Access denied to this business unit" });
      }

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(businessUnit.walletBalance || '0');
      const newBalance = currentBalance + amount;

      console.log('Business Unit Wallet validation:', {
        businessUnitId,
        businessUnitName: businessUnit.name,
        amount,
        maxWalletBalance,
        currentBalance,
        newBalance,
        exceeds: newBalance > maxWalletBalance
      });

      if (newBalance > maxWalletBalance) {
        console.log('Business unit wallet limit exceeded, returning error');
        return res.status(400).json({ 
          message: `Cannot recharge ${businessUnit.name}. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}. You can add up to ₹${(maxWalletBalance - currentBalance).toFixed(2)} more.`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance,
          maxAllowedRecharge: maxWalletBalance - currentBalance
        });
      }
    } else {
      // Business unit ID is required for all recharge operations
      return res.status(400).json({ 
        message: "businessUnitId parameter is required for wallet recharge operations" 
      });
    }

    const order = await createOrder(amount * 100); // Convert to paise
    res.json({ success: true, order });
  } catch (error) {
    console.error("Error creating payment order:", error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
}

export async function verifyPaymentAndAddFunds(req: any, res: Response) {
  try {
    const userId = req.session?.user?.id || req.user?.claims?.sub;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, businessUnitId } = req.body;

    const isValid = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Handle business unit wallet recharge
    if (businessUnitId) {
      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        return res.status(403).json({ message: "Access denied to this business unit" });
      }

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(businessUnit.walletBalance || '0');
      const newBalance = currentBalance + amount;

      if (newBalance > maxWalletBalance) {
        return res.status(400).json({ 
          message: `Cannot recharge ${businessUnit.name}. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance
        });
      }

      // Add funds to business unit wallet
      const updatedBusinessUnit = await storage.updateBusinessUnitWallet(businessUnitId, newBalance.toString());
      
      // Create transaction record for business unit
      await storage.createTransaction({
        userId,
        businessUnitId,
        type: 'recharge',
        amount: amount.toString(),
        description: `Business unit wallet recharge via Razorpay for ${businessUnit.name}`,
        status: 'completed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });

      res.json({ 
        message: `Payment verified and ₹${amount} added to ${businessUnit.name} wallet successfully`,
        businessUnit: updatedBusinessUnit 
      });
    } else {
      // Business unit ID is required for all payment verification operations
      return res.status(400).json({ 
        message: "businessUnitId parameter is required for payment verification" 
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
}

// Helper function for low balance alerts
async function checkAndSendLowBalanceAlert(user: any) {
  const LOW_BALANCE_THRESHOLD = 50.00;
  const balance = parseFloat(user.walletBalance || '0');
  
  if (balance <= LOW_BALANCE_THRESHOLD) {
    console.log(`Low balance alert for user ${user.id}: ₹${balance}`);
    
    try {
      await storage.createTransaction({
        userId: user.id,
        type: 'system_alert',
        amount: '0.00',
        description: `Low balance alert: ₹${balance}`,
        status: 'completed',
      });
    } catch (error) {
      console.error('Failed to log low balance alert:', error);
    }
  }
}