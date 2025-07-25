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
    const validated = insertTransactionSchema.parse({
      ...req.body,
      userId,
    });

    const transaction = await storage.createTransaction(validated);
    
    // Check for low balance alert after transaction
    const user = await storage.getUser(userId);
    if (user) {
      await checkAndSendLowBalanceAlert(user);
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
      // Original user wallet validation for backward compatibility
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(user.walletBalance || '0');
      const newBalance = currentBalance + amount;

      console.log('User Wallet validation:', {
        amount,
        maxWalletBalance,
        currentBalance,
        newBalance,
        exceeds: newBalance > maxWalletBalance
      });

      if (newBalance > maxWalletBalance) {
        console.log('User wallet limit exceeded, returning error');
        return res.status(400).json({ 
          message: `Cannot recharge. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}. You can add up to ₹${(maxWalletBalance - currentBalance).toFixed(2)} more.`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance,
          maxAllowedRecharge: maxWalletBalance - currentBalance
        });
      }
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
      // Original user wallet recharge for backward compatibility
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(user.walletBalance || '0');
      const newBalance = currentBalance + amount;

      if (newBalance > maxWalletBalance) {
        return res.status(400).json({ 
          message: `Cannot recharge. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance
        });
      }

      // Add funds to user wallet
      const updatedUser = await storage.updateWalletBalance(userId, amount.toString());
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'recharge',
        amount: amount.toString(),
        description: `Wallet recharge via Razorpay`,
        status: 'completed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });

      res.json({ 
        message: "Payment verified and funds added successfully",
        user: updatedUser 
      });
    }

    res.json({ 
      message: "Payment verified and funds added successfully",
      user: updatedUser 
    });
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