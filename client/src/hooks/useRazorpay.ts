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
      
      // Cache the prepared order (including callback URLs from backend)
      const preparedData = {
        order: orderResponse.order,
        keyId: orderResponse.keyId,
        callbackUrl: orderResponse.callbackUrl,
        cancelUrl: orderResponse.cancelUrl,
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

  // Phase 2: Execute payment (redirect to Razorpay hosted checkout)
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
    
    // Use REDIRECT flow instead of modal (fixes CORS header issue)
    try {
      setLoading(true);
      console.log("=== REDIRECTING TO RAZORPAY CHECKOUT ===");
      
      const { order, keyId, amount, businessUnitId, userDetails, callbackUrl, cancelUrl } = orderData;
      
      console.log("Payment data:", {
        order_id: order.id,
        amount: order.amount,
        keyId,
        callbackUrl,
        cancelUrl
      });
      
      // Create hidden form to POST to Razorpay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://api.razorpay.com/v1/checkout/embedded';
      
      // Add form fields
      const fields = {
        key_id: keyId,
        amount: order.amount.toString(),
        currency: order.currency,
        name: 'UrbanKetl',
        description: 'Wallet Recharge',
        order_id: order.id,
        callback_url: callbackUrl || `${window.location.origin}/wallet/payment-callback`,
        cancel_url: cancelUrl || `${window.location.origin}/wallet`,
        prefill: {
          name: userDetails?.name || '',
          email: userDetails?.email || '',
        },
        theme: {
          color: '#F2A74A',
        },
      };
      
      // Add all fields to form
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof value === 'object' ? JSON.stringify(value) : value;
        form.appendChild(input);
      });
      
      // Append form to body and submit
      document.body.appendChild(form);
      console.log("📤 Submitting form to Razorpay...");
      form.submit();
      
      // Form submission will navigate away, so we don't need to handle response here
      // The callback page will handle the payment response
      
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