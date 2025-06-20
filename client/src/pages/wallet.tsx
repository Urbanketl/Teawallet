import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Wallet, Plus, IndianRupee } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function WalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const rechargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      // In a real app, you would integrate with Razorpay here
      // For now, we'll simulate a successful payment
      const paymentId = `pay_${Date.now()}`;
      
      return await apiRequest("POST", "/api/wallet/recharge", {
        amount,
        razorpayPaymentId: paymentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success!",
        description: "Wallet recharged successfully",
      });
      setCustomAmount("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to recharge wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const quickAmounts = [100, 250, 500, 1000];

  const handleQuickRecharge = (amount: number) => {
    rechargeMutation.mutate(amount);
  };

  const handleCustomRecharge = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    rechargeMutation.mutate(amount);
  };

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">Digital Wallet</h1>
          <p className="text-gray-600">Manage your wallet balance and recharge funds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Balance */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-tea-green" />
                <span>Current Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-tea-green/10 to-tea-light/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 font-medium">Available Balance</span>
                  <IndianRupee className="w-5 h-5 text-tea-green" />
                </div>
                <div className="text-4xl font-bold text-tea-dark mb-2">
                  ₹{parseFloat(user.walletBalance || "0").toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Ready to use</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Recharge */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-tea-green" />
                <span>Quick Recharge</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-12 text-lg hover:bg-tea-green hover:text-white hover:border-tea-green"
                    onClick={() => handleQuickRecharge(amount)}
                    disabled={rechargeMutation.isPending}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-amount">Custom Amount</Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min="1"
                    step="0.01"
                  />
                </div>
                
                <Button
                  className="w-full bg-tea-green hover:bg-tea-dark"
                  onClick={handleCustomRecharge}
                  disabled={rechargeMutation.isPending || !customAmount}
                >
                  {rechargeMutation.isPending ? "Processing..." : "Recharge Wallet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Info */}
        <Card className="shadow-material mt-8">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 15h7v-1H7v1zm0-2h7v-1H7v1zm0-2h10v-1H7v1z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Credit/Debit Cards</h3>
                <p className="text-sm text-gray-600">Visa, Mastercard, Rupay</p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">UPI</h3>
                <p className="text-sm text-gray-600">PhonePe, Google Pay, Paytm</p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Net Banking</h3>
                <p className="text-sm text-gray-600">All major banks supported</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-tea-green/10 rounded-lg">
              <p className="text-sm text-tea-dark">
                <strong>Secure Payments:</strong> All transactions are processed securely through Razorpay 
                with bank-level encryption and fraud protection.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
