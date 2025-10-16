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

  // Removed: window message listener (not needed for modal implementation)

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
  // Accept prepared order directly to maintain click gesture chain
  const executePayment = (cached?: any) => {
    // Use passed parameter or fallback to state/localStorage
    const orderData = cached || preparedOrder || JSON.parse(localStorage.getItem('preparedPaymentOrder') || 'null');
    
    if (!orderData) {
      toast({
        title: "Payment Not Ready",
        description: "Please try again",
        variant: "destructive",
      });
      return;
    }
    
    // Synchronously open Razorpay modal
    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay not loaded. Please refresh the page.");
      }
      
      setLoading(true);
      console.log("=== OPENING RAZORPAY MODAL ===");
      
      const { order, keyId, amount, businessUnitId, userDetails } = orderData;
      
      // Define safety timeout variable BEFORE using it
      let safetyTimeout: NodeJS.Timeout;
      
      // Verify payment function
      const verifyPayment = (response: any) => {
        console.log("✓ Verifying payment:", response);
        
        apiRequest("POST", "/api/wallet/verify-payment", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount,
          businessUnitId,
        })
        .then(verifyRes => verifyRes.json())
        .then(verifyResponse => {
          if (verifyResponse.success) {
            // Clear cached order
            setPreparedOrder(null);
            localStorage.removeItem('preparedPaymentOrder');
            
            // Refetch data
            queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
            queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
            queryClient.refetchQueries({ 
              predicate: (query) => {
                const key = query.queryKey[0];
                return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
              }
            });

            toast({
              title: "Payment Successful!",
              description: `₹${amount} added to your wallet successfully`,
            });
            setLoading(false);
          } else {
            throw new Error("Payment verification failed");
          }
        })
        .catch(error => {
          console.error("Payment verification error:", error);
          toast({
            title: "Verification Failed",
            description: "Please contact support if amount was deducted",
            variant: "destructive",
          });
          setLoading(false);
        });
      };
      
      // Build options object with all callbacks properly defined
      const options: RazorpayOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "UrbanKetl",
        description: "Wallet Recharge",
        order_id: order.id,
        handler: function(response: any) {
          console.log("✓ Payment success:", response);
          clearTimeout(safetyTimeout);
          verifyPayment(response);
        },
        modal: {
          ondismiss: function() {
            console.log("✓ Payment popup closed by user");
            clearTimeout(safetyTimeout);
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

      console.log("Razorpay options:", {
        key: keyId,
        amount: order.amount,
        order_id: order.id,
      });

      // Create Razorpay instance
      const razorpay = new window.Razorpay(options);
      
      // Add payment.failed listener
      razorpay.on("payment.failed", function(response: any) {
        console.error("Payment failed:", response);
        clearTimeout(safetyTimeout);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not successful",
          variant: "destructive",
        });
        setLoading(false);
      });
      
      // Safety timeout - 2 minutes (users need time to complete payment)
      safetyTimeout = setTimeout(() => {
        console.warn("⚠️ Modal still open after 2 minutes");
        // Don't close or show error - user might still be paying
      }, 120000);
      
      console.log("🚀 Opening Razorpay modal...");
      console.log("Razorpay instance:", razorpay);
      console.log("Razorpay.open type:", typeof razorpay.open);
      
      // Check if Razorpay is truly ready
      if (typeof razorpay.open !== 'function') {
        throw new Error("Razorpay modal not ready");
      }
      
      // Try to open modal with error catching
      try {
        const result = razorpay.open();
        console.log("✅ Razorpay.open() returned:", result);
        console.log("✅ Modal should now be visible on screen");
        
        // Check if modal actually rendered (DOM check)
        setTimeout(() => {
          const razorpayContainer = document.querySelector('.razorpay-container');
          const razorpayBackdrop = document.querySelector('[class*="razorpay"]');
          console.log("🔍 Razorpay container in DOM:", razorpayContainer);
          console.log("🔍 Any Razorpay elements:", razorpayBackdrop);
          
          if (!razorpayContainer && !razorpayBackdrop) {
            console.error("❌ MODAL NOT IN DOM! Razorpay failed to render.");
            toast({
              title: "Payment Modal Failed",
              description: "The payment window could not open. Please try refreshing the page.",
              variant: "destructive",
            });
            setLoading(false);
          }
        }, 500);
      } catch (openError: any) {
        console.error("❌ Razorpay.open() threw error:", openError);
        throw new Error(`Failed to open Razorpay: ${openError.message}`);
      }
      
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