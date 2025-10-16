import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get payment details from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const razorpay_payment_id = urlParams.get('razorpay_payment_id');
        const razorpay_order_id = urlParams.get('razorpay_order_id');
        const razorpay_signature = urlParams.get('razorpay_signature');
        
        // Get stored payment data
        const storedData = localStorage.getItem('preparedPaymentOrder');
        if (!storedData) {
          throw new Error('Payment data not found');
        }
        
        const paymentData = JSON.parse(storedData);
        const { amount, businessUnitId } = paymentData;
        
        console.log('=== PROCESSING PAYMENT CALLBACK ===');
        console.log('Payment ID:', razorpay_payment_id);
        console.log('Order ID:', razorpay_order_id);
        console.log('Amount:', amount);
        console.log('Business Unit:', businessUnitId);

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          throw new Error('Invalid payment response');
        }

        // Verify payment
        const verifyRes = await apiRequest("POST", "/api/wallet/verify-payment", {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          amount,
          businessUnitId,
        });

        if (verifyRes.ok) {
          const result = await verifyRes.json();
          console.log('Payment verified successfully:', result);
          
          setStatus('success');
          setMessage(`₹${amount} has been added to your wallet successfully!`);
          
          // Clear stored order
          localStorage.removeItem('preparedPaymentOrder');
          
          // Refresh wallet data
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
            description: `₹${amount} added to your wallet`,
          });
          
          // Redirect to wallet page after 2 seconds
          setTimeout(() => {
            setLocation('/wallet');
          }, 2000);
        } else {
          throw new Error("Payment verification failed");
        }
      } catch (error: any) {
        console.error("Payment callback error:", error);
        setStatus('failed');
        setMessage(error.message || 'Payment verification failed');
        
        toast({
          title: "Payment Failed",
          description: "Please contact support if amount was deducted",
          variant: "destructive",
        });
        
        // Redirect to wallet page after 3 seconds
        setTimeout(() => {
          setLocation('/wallet');
        }, 3000);
      }
    };

    processCallback();
  }, [queryClient, toast, setLocation]);

  return (
    <div className="min-h-screen bg-neutral-warm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'processing' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto text-tea-green animate-spin" />
                <h2 className="text-2xl font-bold text-gray-900">Processing Payment</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to wallet...</p>
              </>
            )}
            
            {status === 'failed' && (
              <>
                <XCircle className="w-16 h-16 mx-auto text-red-500" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to wallet...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
