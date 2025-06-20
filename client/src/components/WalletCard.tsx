import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Wallet, Plus, IndianRupee, AlertTriangle, CreditCard } from "lucide-react";

export default function WalletCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const balance = parseFloat(user?.walletBalance || '0');
  const LOW_BALANCE_THRESHOLD = 50.00;
  const isLowBalance = balance <= LOW_BALANCE_THRESHOLD;
  
  // Show low balance alert
  useEffect(() => {
    if (isLowBalance && balance > 0) {
      toast({
        title: "Low Wallet Balance",
        description: `Your balance is ₹${balance.toFixed(2)}. Recharge now to avoid interruption!`,
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [balance, isLowBalance, toast]);
  const { initiatePayment, loading } = useRazorpay();
  const [customAmount, setCustomAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const quickAmounts = [100, 250, 500, 1000];

  const handleQuickRecharge = (amount: number) => {
    initiatePayment(amount, {
      name: `${user?.firstName} ${user?.lastName}`.trim(),
      email: user?.email || "",
    });
  };

  const handleCustomRecharge = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    
    initiatePayment(amount, {
      name: `${user?.firstName} ${user?.lastName}`.trim(),
      email: user?.email || "",
    });
    
    setCustomAmount("");
    setDialogOpen(false);
  };

  return (
    <Card className="shadow-material">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-tea-green" />
          <span>Digital Wallet</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Balance */}
          <div className={`rounded-xl p-6 ${
            isLowBalance 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200' 
              : 'bg-gradient-to-br from-tea-green/10 to-tea-light/10'
          }`}>
            {isLowBalance && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="text-xs text-red-700 font-medium">
                  Low Balance Alert!
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 font-medium">Current Balance</span>
              <IndianRupee className={`w-5 h-5 ${isLowBalance ? 'text-red-500' : 'text-tea-green'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              isLowBalance ? 'text-red-600' : 'text-tea-dark'
            }`}>
              ₹{balance.toFixed(2)}
            </div>
            <div className={`text-sm ${isLowBalance ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
              {isLowBalance ? 'Recharge needed' : 'Available for use'}
            </div>
          </div>
          
          {/* Quick Recharge */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Quick Recharge</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className="hover:bg-tea-green hover:text-white hover:border-tea-green transition-all duration-200"
                  onClick={() => handleQuickRecharge(amount)}
                  disabled={loading}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-tea-green hover:bg-tea-dark">
                  <Plus className="w-4 h-4 mr-2" />
                  Custom Amount
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recharge Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="custom-amount">Enter Amount (₹)</Label>
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
                    disabled={loading || !customAmount}
                  >
                    {loading ? "Processing..." : "Recharge Now"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
