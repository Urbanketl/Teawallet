import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: {
    name?: string;
    email?: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
}

// Global flag to prevent duplicate script loads
let razorpayScriptLoading = false;

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparedOrder, setPreparedOrder] = useState<any>(null);
  const { toast} = useToast();
  const queryClient = useQueryClient();
  
  // Prevent multiple simultaneous payment attempts
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  // Handle payment success callback
  const handlePaymentSuccess = useCallback(async (paymentData: any) => {
    try {
      console.log("Processing payment verification:", paymentData);
      
      const amount = JSON.parse(localStorage.getItem('lastPaymentOrder') || '{}').amount;
      
      const lastOrder = JSON.parse(localStorage.getItem('lastPaymentOrder') || '{}');
      const verifyRes = await apiRequest("POST", "/api/wallet/verify-payment", {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        amount: amount / 100, // Convert from paise to rupees
        businessUnitId: lastOrder.businessUnitId,
      });

      if (verifyRes.ok) {
        const result = await verifyRes.json();
        console.log("Payment verified successfully:", result);
        
        setLoading(false);
        toast({
          title: "Payment Successful!",
          description: `₹${amount / 100} has been added to your wallet.`,
        });
        
        // Refresh wallet data - FORCE refetch because of staleTime: Infinity
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
        
        // FORCE refetch ALL business units queries (with or without pseudo params)
        await queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
          }
        });
        
        // Also refetch any specific business unit queries
        await queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && (
              key.startsWith('/api/corporate/monthly-summary') ||
              key.startsWith('/api/corporate/business-unit-summary')
            );
          }
        });
        
        // Clear stored order
        localStorage.removeItem('lastPaymentOrder');
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      setLoading(false);
      toast({
        title: "Payment Verification Failed",
        description: "Please contact support if amount was deducted.",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  // Listen for payment success from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PAYMENT_SUCCESS') {
        console.log("Payment success received from popup:", event.data.data);
        handlePaymentSuccess(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handlePaymentSuccess]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        console.log("Razorpay already available");
        resolve(true);
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        console.log("Razorpay script exists, waiting for load...");
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        const checkRazorpay = () => {
          attempts++;
          if (window.Razorpay) {
            console.log(`Razorpay loaded after ${attempts} attempts`);
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.error("Razorpay script timeout - never became available");
            resolve(false);
          } else {
            setTimeout(checkRazorpay, 100);
          }
        };
        checkRazorpay();
        return;
      }

      // Check if script is already being loaded
      if (razorpayScriptLoading) {
        console.log("Razorpay script already loading, waiting...");
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        const checkRazorpay = () => {
          attempts++;
          if (window.Razorpay) {
            console.log(`Razorpay loaded after ${attempts} attempts (was loading)`);
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.error("Razorpay script loading timeout");
            razorpayScriptLoading = false; // Reset flag on timeout
            resolve(false);
          } else {
            setTimeout(checkRazorpay, 100);
          }
        };
        checkRazorpay();
        return;
      }

      // Set loading flag to prevent duplicate loads
      razorpayScriptLoading = true;
      console.log("Loading Razorpay script dynamically...");
      
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        console.log("Razorpay script loaded successfully");
        razorpayScriptLoading = false; // Reset flag after successful load
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if (window.Razorpay) {
            console.log("Razorpay confirmed available after script load");
            resolve(true);
          } else {
            console.error("Razorpay script loaded but window.Razorpay still not available");
            resolve(false);
          }
        }, 100);
      };
      script.onerror = (error) => {
        console.error("Failed to load Razorpay script:", error);
        razorpayScriptLoading = false; // Reset flag on error
        resolve(false);
      };
      
      // Add timeout for script loading
      setTimeout(() => {
        if (!window.Razorpay) {
          console.error("Razorpay script loading timeout");
          razorpayScriptLoading = false; // Reset flag on timeout
          resolve(false);
        }
      }, 10000); // 10 second timeout for script loading
      
      document.body.appendChild(script);
    });
  };

  // Phase 1: Prepare payment (create order, cache it)
  const preparePayment = async (amount: number, businessUnitId?: string, userDetails?: { name?: string; email?: string }) => {
    if (preparing) return;
    
    try {
      setPreparing(true);
      console.log("=== PREPARING PAYMENT ===");
      console.log("Amount:", amount, "Business Unit:", businessUnitId);
      
      // Pre-load Razorpay script
      await loadRazorpayScript();
      
      // Create order
      const orderData = { 
        amount,
        ...(businessUnitId && { businessUnitId })
      };
      const orderRes = await apiRequest("POST", "/api/wallet/create-order", orderData);
      
      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        if (orderRes.status === 429) {
          throw new Error("Too many payment requests. Please wait a moment and try again.");
        }
        if (orderRes.status === 400 && errorData.message) {
          throw new Error(errorData.message);
        }
        throw new Error(`Failed to create order: ${orderRes.status}`);
      }
      
      const orderResponse = await orderRes.json();
      if (!orderResponse.success || !orderResponse.order || !orderResponse.keyId) {
        throw new Error(orderResponse.message || "Failed to create payment order");
      }
      
      // Cache the prepared order
      const preparedData = {
        order: orderResponse.order,
        keyId: orderResponse.keyId,
        amount,
        businessUnitId,
        userDetails,
        preparedAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      };
      
      setPreparedOrder(preparedData);
      localStorage.setItem('preparedPaymentOrder', JSON.stringify(preparedData));
      
      console.log("Payment prepared successfully:", preparedData);
      return preparedData;
    } catch (error: any) {
      console.error("Error preparing payment:", error);
      toast({
        title: "Preparation Failed",
        description: error.message || "Failed to prepare payment",
        variant: "destructive",
      });
      throw error;
    } finally {
      setPreparing(false);
    }
  };

  // Legacy: Combines both phases (for backwards compatibility, but may be blocked)
  const initiatePayment = async (amount: number, userDetails?: { name?: string; email?: string; businessUnitId?: string }) => {
    // Just call the two-phase approach
    await preparePayment(amount, userDetails?.businessUnitId, userDetails);
    // Note: executePayment must be called separately from a synchronous click handler
  };

  // Phase 2: Execute payment (open modal synchronously)
  const executePayment = () => {
    // Check for prepared order
    const cached = preparedOrder || JSON.parse(localStorage.getItem('preparedPaymentOrder') || 'null');
    
    if (!cached) {
      toast({
        title: "Payment Not Ready",
        description: "Please wait for payment to be prepared",
        variant: "destructive",
      });
      return;
    }
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      toast({
        title: "Payment Expired",
        description: "Please try again to create a new payment",
        variant: "destructive",
      });
      setPreparedOrder(null);
      localStorage.removeItem('preparedPaymentOrder');
      return;
    }
    
    // Synchronously open Razorpay modal
    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay not loaded. Please refresh the page.");
      }
      
      setLoading(true);
      console.log("=== EXECUTING PAYMENT (SYNCHRONOUS) ===");
      
      const { order, keyId, amount, businessUnitId, userDetails } = cached;
      
      const options: RazorpayOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "UrbanKetl",
        description: "Wallet Recharge",
        order_id: order.id,
        modal: {
          ondismiss: () => {
            console.log("✓ Modal dismissed by user");
            clearTimeout(safetyTimeout);
            setLoading(false);
          },
        },
        handler: async (response: any) => {
          console.log("✓ Payment handler triggered");
          clearTimeout(safetyTimeout);
          try {
            // Verify payment
            const verifyRes = await apiRequest("POST", "/api/wallet/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount,
              businessUnitId,
            });
            const verifyResponse = await verifyRes.json();

            if (verifyResponse.success) {
              // Clear cached order
              setPreparedOrder(null);
              localStorage.removeItem('preparedPaymentOrder');
              
              // Refetch data
              await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
              await queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
              await queryClient.refetchQueries({ 
                predicate: (query) => {
                  const key = query.queryKey[0];
                  return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
                }
              });

              toast({
                title: "Payment Successful!",
                description: `₹${amount} added to your wallet successfully`,
              });
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast({
              title: "Verification Failed",
              description: "Please contact support if amount was deducted",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: userDetails?.name || "",
          email: userDetails?.email || "",
        },
        theme: {
          color: "#F2A74A",
        },
      };

      const razorpay = new window.Razorpay(options);
      
      // Safety timeout: If no events fire within 3 seconds, reset
      const safetyTimeout = setTimeout(() => {
        console.warn("⚠️ Modal didn't trigger any events - possible Razorpay issue");
        setLoading(false);
        toast({
          title: "Payment Modal Issue",
          description: "Please try again in a few moments",
          variant: "destructive",
        });
      }, 3000);
      
      // Clear timeout when any event fires
      const clearSafety = () => {
        console.log("Modal event detected, clearing safety timeout");
        clearTimeout(safetyTimeout);
      };
      
      razorpay.on("payment.failed", (response: any) => {
        clearSafety();
        console.error("Payment failed:", response);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not successful",
          variant: "destructive",
        });
        setLoading(false);
      });
      
      console.log("Opening Razorpay synchronously...");
      razorpay.open();
      console.log("Razorpay opened successfully - waiting for events...");
      
    } catch (error: any) {
      console.error("Error executing payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to open payment",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return {
    initiatePayment, // Keep for backwards compatibility
    preparePayment,
    executePayment,
    preparing,
    preparedOrder,
    loading,
  };
}