import { useState } from "react";
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
        const checkRazorpay = () => {
          if (window.Razorpay) {
            resolve(true);
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
        resolve(true);
      };
      script.onerror = (error) => {
        console.error("Failed to load Razorpay script:", error);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (amount: number, userDetails?: { name?: string; email?: string }) => {
    try {
      setLoading(true);

      // Create order first
      const orderResponse = await apiRequest("POST", "/api/wallet/create-order", { amount });
      
      if (!orderResponse.success) {
        throw new Error("Failed to create payment order");
      }

      const { order, keyId } = orderResponse;

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay script. Please check your internet connection.");
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
            const verifyResponse = await apiRequest("POST", "/api/wallet/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount,
            });

            if (verifyResponse.success) {
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
              queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

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
          color: "#22c55e", // tea-green color
        },
      };

      console.log("Opening Razorpay with options:", { ...options, key: "***" });

      const razorpay = new window.Razorpay(options);
      
      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not successful",
          variant: "destructive",
        });
        setLoading(false);
      });

      razorpay.on("payment.cancelled", () => {
        console.log("Payment cancelled by user");
        setLoading(false);
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Payment initiation error:", error);
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