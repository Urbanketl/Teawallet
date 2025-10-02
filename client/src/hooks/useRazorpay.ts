import { useState, useEffect } from "react";
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
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Prevent multiple simultaneous payment attempts
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  // Handle payment success callback
  const handlePaymentSuccess = async (paymentData: any) => {
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
        
        // Refresh wallet data - invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        
        // Invalidate ALL business units queries (with or without pseudo params)
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
          }
        });
        
        // Also invalidate any specific business unit queries
        queryClient.invalidateQueries({
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
  };

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

      console.log("Loading Razorpay script dynamically...");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        console.log("Razorpay script loaded successfully");
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
        resolve(false);
      };
      
      // Add timeout for script loading
      setTimeout(() => {
        if (!window.Razorpay) {
          console.error("Razorpay script loading timeout");
          resolve(false);
        }
      }, 10000); // 10 second timeout for script loading
      
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (amount: number, userDetails?: { name?: string; email?: string; businessUnitId?: string }) => {
    // Prevent rapid-fire requests (debounce)
    const now = Date.now();
    if (now - lastAttemptTime < 2000) { // 2 second cooldown
      console.warn("Payment attempt too soon, ignoring");
      toast({
        title: "Please Wait",
        description: "Please wait a moment before trying again",
        variant: "destructive",
      });
      return;
    }
    
    if (loading) {
      console.warn("Payment already in progress, ignoring");
      return;
    }
    
    try {
      setLoading(true);
      setLastAttemptTime(now);
      console.log("=== PAYMENT INITIATION START ===");
      console.log("Amount:", amount);
      console.log("User details:", userDetails);
      console.log("Loading state set to true");

      // Create order first
      console.log("Creating order...");
      const orderData = { 
        amount,
        ...(userDetails?.businessUnitId && { businessUnitId: userDetails.businessUnitId })
      };
      const orderRes = await apiRequest("POST", "/api/wallet/create-order", orderData);
      
      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        console.log("Order creation error:", errorData);
        
        if (orderRes.status === 429) {
          throw new Error("Too many payment requests. Please wait a moment and try again.");
        }
        if (orderRes.status === 400 && errorData.message) {
          // This will catch max wallet limit errors
          throw new Error(errorData.message);
        }
        throw new Error(`Failed to create order: ${orderRes.status}`);
      }
      
      const orderResponse = await orderRes.json();
      console.log("Order response:", orderResponse);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || "Failed to create payment order");
      }

      // Store order details for manual fallback
      localStorage.setItem('lastPaymentOrder', JSON.stringify({
        id: orderResponse.order.id,
        amount: orderResponse.order.amount,
        key: orderResponse.keyId,
        businessUnitId: userDetails?.businessUnitId
      }));

      const { order, keyId } = orderResponse;
      console.log("Order created successfully:", order);

      // Load Razorpay script
      console.log("Loading Razorpay script...");
      const scriptLoaded = await loadRazorpayScript();
      console.log("Script loaded result:", scriptLoaded);
      
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay script. Please check your internet connection.");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not available");
      }

      const options: RazorpayOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "UrbanKetl",
        description: "Wallet Recharge",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            console.log("Payment successful, verifying...", response);
            // Verify payment
            const verifyRes = await apiRequest("POST", "/api/wallet/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount,
              businessUnitId: userDetails?.businessUnitId,
            });
            const verifyResponse = await verifyRes.json();

            if (verifyResponse.success) {
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
              queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
              
              // Invalidate ALL business units queries (with or without pseudo params)
              queryClient.invalidateQueries({ 
                predicate: (query) => {
                  const key = query.queryKey[0];
                  return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
                }
              });
              
              // Also invalidate any specific business unit queries
              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey[0];
                  return typeof key === 'string' && (
                    key.startsWith('/api/corporate/monthly-summary') ||
                    key.startsWith('/api/corporate/business-unit-summary')
                  );
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
              title: "Payment Verification Failed",
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
          color: "#F2A74A", // primary orange color
        },
      };

      console.log("Opening Razorpay with options:", { ...options, key: "***" });

      console.log("Creating Razorpay instance...");
      const razorpay = new window.Razorpay(options);
      console.log("Razorpay instance created successfully");
      
      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response);
        clearTimeout(timeoutId);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not successful",
          variant: "destructive",
        });
        setLoading(false);
      });

      razorpay.on("payment.cancelled", () => {
        console.log("Payment cancelled by user");
        clearTimeout(timeoutId);
        setLoading(false);
      });

      // Add modal dismiss event handler
      razorpay.on("payment.closed", () => {
        console.log("Payment modal closed");
        clearTimeout(timeoutId);
        setLoading(false);
      });

      console.log("Opening Razorpay checkout...");
      
      // Add a timeout for popup blocking detection
      let timeoutId: NodeJS.Timeout;

      try {
        console.log("Attempting to open Razorpay modal...");
        razorpay.open();
        console.log("Razorpay.open() called successfully");
        
        // Start popup detection timer immediately
        timeoutId = setTimeout(() => {
          console.warn("Payment modal seems blocked, opening fallback...");
          setLoading(false);
          
          // Create a form that redirects to payment
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = `/payment-redirect`;
          form.target = '_blank';
          
          // Add form fields
          const fields = {
            order_id: order.id,
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'UrbanKetl',
            description: 'Wallet Recharge'
          };
          
          Object.entries(fields).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
          
          toast({
            title: "Payment Opened",
            description: "Complete your payment in the new tab",
            duration: 5000,
          });
        }, 2000); // 2 second detection
        
      } catch (openError) {
        console.error("Error opening Razorpay:", openError);
        setLoading(false);
        toast({
          title: "Payment Error",
          description: "Please try again",
          variant: "destructive",
        });
        throw openError;
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return {
    initiatePayment,
    loading,
  };
}