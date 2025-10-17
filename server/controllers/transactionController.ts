import { Request, Response } from "express";
import { storage } from "../storage";
import { insertTransactionSchema } from "@shared/schema";
import { createOrder, verifyPayment, createPaymentLink, verifyPaymentLink } from "../razorpay";

export async function getUserTransactions(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const transactions = await storage.getUserTransactions(userId);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

export async function createTransaction(req: any, res: Response) {
  try {
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
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

    try {
      const order = await createOrder(amount); // Amount is already in rupees
      
      // Debug: Check order and keyId environment
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keyMode = keyId?.startsWith('rzp_test_') ? 'TEST MODE' : keyId?.startsWith('rzp_live_') ? 'LIVE MODE' : 'UNKNOWN';
      console.log("=== SENDING TO FRONTEND ===");
      console.log("Order ID:", order.id);
      console.log("Key ID:", keyId);
      console.log("Environment:", keyMode);
      console.log("Order belongs to:", order.id.startsWith('order_') ? 'Razorpay Order' : 'Unknown');
      
      // Build callback URLs for redirect flow
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const callbackUrl = `${baseUrl}/wallet/payment-callback`;
      const cancelUrl = `${baseUrl}/wallet`;
      
      console.log("Redirect URLs:", { callbackUrl, cancelUrl });
      
      res.json({ 
        success: true, 
        order, 
        keyId: process.env.RAZORPAY_KEY_ID,
        callbackUrl,
        cancelUrl,
        businessUnitId // Include for callback processing
      });
    } catch (razorpayError: any) {
      console.error('Razorpay order creation error:', razorpayError);
      
      // Handle specific Razorpay errors
      if (razorpayError.statusCode === 400 && razorpayError.error?.description?.includes('Amount exceeds maximum')) {
        return res.status(400).json({ 
          message: `Payment amount ₹${amount} exceeds Razorpay's maximum limit. Please try a smaller amount (maximum ₹5000 for demo accounts).`,
          maxSuggestedAmount: 5000
        });
      }
      
      throw razorpayError; // Re-throw other errors
    }
  } catch (error) {
    console.error("Error creating payment order:", error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
}

export async function createPaymentLinkForWallet(req: any, res: Response) {
  try {
    const { amount, businessUnitId } = req.body;
    const userId = req.user.id;
    
    console.log('=== CREATE PAYMENT LINK ===');
    console.log('Amount:', amount);
    console.log('User ID:', userId);
    console.log('Business Unit ID:', businessUnitId);
    
    if (!amount || amount <= 0) {
      console.log('Invalid amount, returning error');
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Validate business unit access and wallet limit
    if (businessUnitId) {
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
          message: `Cannot recharge ${businessUnit.name}. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}. You can add up to ₹${(maxWalletBalance - currentBalance).toFixed(2)} more.`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance,
          maxAllowedRecharge: maxWalletBalance - currentBalance
        });
      }
    } else {
      return res.status(400).json({ 
        message: "businessUnitId parameter is required for wallet recharge operations" 
      });
    }

    try {
      // Build callback URL - use API route to avoid conflict with frontend route
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const callbackUrl = `${baseUrl}/api/razorpay-callback`;
      
      // Get user details for prefill
      const user = await storage.getUser(userId);
      const customerDetails = {
        name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || undefined,
        email: user?.email,
      };
      
      // Create reference ID to store metadata
      const referenceId = `bu_${businessUnitId}_${Date.now()}`;
      
      // Create payment link
      const paymentLink = await createPaymentLink(
        amount,
        customerDetails,
        callbackUrl,
        referenceId
      );
      
      console.log("=== PAYMENT LINK CREATED ===");
      console.log("Link ID:", paymentLink.id);
      console.log("Short URL:", paymentLink.short_url);
      console.log("Reference ID:", referenceId);
      
      res.json({ 
        success: true, 
        paymentLink: {
          id: paymentLink.id,
          short_url: paymentLink.short_url,
          amount: paymentLink.amount,
          reference_id: paymentLink.reference_id,
        },
        amount,
        businessUnitId,
        referenceId,
        userId  // Include userId for verification without auth
      });
    } catch (razorpayError: any) {
      console.error('Razorpay payment link creation error:', razorpayError);
      
      if (razorpayError.statusCode === 400 && razorpayError.error?.description?.includes('Amount exceeds maximum')) {
        return res.status(400).json({ 
          message: `Payment amount ₹${amount} exceeds Razorpay's maximum limit. Please try a smaller amount (maximum ₹5000 for demo accounts).`,
          maxSuggestedAmount: 5000
        });
      }
      
      throw razorpayError;
    }
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({ message: "Failed to create payment link" });
  }
}

export async function verifyPaymentLinkAndAddFunds(req: any, res: Response) {
  try {
    console.log('=== PAYMENT LINK VERIFICATION REQUEST RECEIVED ===');
    console.log('User authenticated:', !!req.user);
    console.log('User object:', req.user);
    
    const { razorpay_payment_link_id, razorpay_payment_id, razorpay_signature, amount, businessUnitId, userId } = req.body;

    console.log('=== PAYMENT LINK VERIFICATION ===');
    console.log('User ID from request:', userId);
    console.log('Request body:', { razorpay_payment_link_id, razorpay_payment_id, amount, businessUnitId, userId });

    const isValid = await verifyPaymentLink(razorpay_payment_link_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      console.error('Payment link signature verification failed');
      return res.status(400).json({ message: "Payment verification failed" });
    }
    
    console.log('Payment link signature verified successfully');

    // Handle business unit wallet recharge
    if (businessUnitId) {
      console.log(`[VERIFICATION STEP 1] Fetching business units for user ${userId}`);
      
      // Verify user has access to this business unit
      const userBusinessUnits = await storage.getUserBusinessUnits(userId);
      console.log(`[VERIFICATION STEP 2] User has access to ${userBusinessUnits.length} business units`);
      
      const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
      
      if (!businessUnit) {
        console.error(`[VERIFICATION ERROR] User ${userId} does not have access to business unit ${businessUnitId}`);
        return res.status(403).json({ message: "Access denied to this business unit" });
      }
      
      console.log(`[VERIFICATION STEP 3] Business unit found:`, {
        id: businessUnit.id,
        name: businessUnit.name,
        currentBalance: businessUnit.walletBalance
      });

      const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '5000.00';
      const maxWalletBalance = parseFloat(maxWalletBalanceStr);
      const currentBalance = parseFloat(businessUnit.walletBalance || '0');
      const newBalance = currentBalance + amount;
      
      console.log(`[VERIFICATION STEP 4] Balance calculation:`, {
        currentBalance,
        paymentAmount: amount,
        newBalance,
        maxAllowed: maxWalletBalance
      });

      if (newBalance > maxWalletBalance) {
        console.error(`[VERIFICATION ERROR] Balance would exceed maximum: ${newBalance} > ${maxWalletBalance}`);
        return res.status(400).json({ 
          message: `Cannot recharge ${businessUnit.name}. Maximum wallet balance is ₹${maxWalletBalance}. Current balance: ₹${currentBalance}`,
          maxBalance: maxWalletBalance,
          currentBalance: currentBalance
        });
      }

      console.log(`[VERIFICATION STEP 5] Updating wallet balance from ${currentBalance} to ${newBalance}`);
      
      // Add funds to business unit wallet
      const updatedBusinessUnit = await storage.updateBusinessUnitWallet(businessUnitId, newBalance.toString());
      
      console.log(`[VERIFICATION STEP 6] Wallet updated successfully. Now creating transaction record...`);
      
      // Create transaction record for business unit
      try {
        const transaction = await storage.createTransaction({
          userId,
          businessUnitId,
          type: 'recharge',
          amount: amount.toString(),
          description: `Business unit wallet recharge via Razorpay Payment Link for ${businessUnit.name} (Link: ${razorpay_payment_link_id})`,
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
        });
        console.log('[VERIFICATION STEP 7] Transaction created successfully:', transaction);
      } catch (txnError) {
        console.error('[VERIFICATION ERROR] ERROR creating transaction record:', txnError);
        console.error('[VERIFICATION ERROR] Transaction data that failed:', {
          userId,
          businessUnitId,
          type: 'recharge',
          amount: amount.toString(),
          description: `Business unit wallet recharge via Razorpay Payment Link for ${businessUnit.name} (Link: ${razorpay_payment_link_id})`,
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
        });
        // Don't throw - wallet is already updated, just log the error
      }

      console.log(`[VERIFICATION COMPLETE] Payment successful: ₹${amount} added to ${businessUnit.name}`);
      
      res.json({ 
        message: `Payment verified and ₹${amount} added to ${businessUnit.name} wallet successfully`,
        businessUnit: updatedBusinessUnit 
      });
    } else {
      console.error('Payment verification failed: businessUnitId missing in request');
      return res.status(400).json({ 
        message: "businessUnitId parameter is required for payment verification" 
      });
    }
  } catch (error) {
    console.error("Error verifying payment link:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
}

export async function verifyPaymentAndAddFunds(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, businessUnitId } = req.body;

    console.log('=== PAYMENT VERIFICATION ===');
    console.log('User ID:', userId);
    console.log('Request body:', { razorpay_order_id, razorpay_payment_id, amount, businessUnitId });

    const isValid = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      console.error('Payment signature verification failed');
      return res.status(400).json({ message: "Payment verification failed" });
    }
    
    console.log('Payment signature verified successfully');

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

      console.log(`Payment successful: ₹${amount} added to ${businessUnit.name}`);
      
      res.json({ 
        message: `Payment verified and ₹${amount} added to ${businessUnit.name} wallet successfully`,
        businessUnit: updatedBusinessUnit 
      });
    } else {
      // Business unit ID is required for all payment verification operations
      console.error('Payment verification failed: businessUnitId missing in request');
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

export async function testPayment(req: any, res: Response) {
  try {
    const { amount, businessUnitId } = req.body;
    const userId = req.user.id;
    
    console.log('=== TEST PAYMENT (DEV MODE) ===');
    console.log('Amount:', amount);
    console.log('Business Unit ID:', businessUnitId);
    console.log('User ID:', userId);

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    if (!businessUnitId) {
      return res.status(400).json({ message: "Business unit ID is required" });
    }

    const userBusinessUnits = await storage.getUserBusinessUnits(userId);
    const businessUnit = userBusinessUnits.find(bu => bu.id === businessUnitId);
    
    if (!businessUnit) {
      return res.status(403).json({ message: "Access denied to this business unit" });
    }

    const maxWalletBalanceStr = await storage.getSystemSetting('max_wallet_balance') || '50000.00';
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

    const updatedBusinessUnit = await storage.updateBusinessUnitWallet(businessUnitId, newBalance.toString());
    
    await storage.createTransaction({
      userId,
      businessUnitId,
      type: 'recharge',
      amount: amount.toString(),
      description: `TEST: Wallet recharge for ${businessUnit.name} (Dev Mode)`,
      status: 'completed',
      razorpayOrderId: `TEST_ORDER_${Date.now()}`,
      razorpayPaymentId: `TEST_PAY_${Date.now()}`,
    });

    console.log(`TEST Payment successful: ₹${amount} added to ${businessUnit.name}`);
    
    res.json({ 
      success: true,
      message: `₹${amount} added to ${businessUnit.name} wallet (Test Mode)`,
      businessUnit: updatedBusinessUnit 
    });
  } catch (error) {
    console.error("Error processing test payment:", error);
    res.status(500).json({ message: "Failed to process test payment" });
  }
}