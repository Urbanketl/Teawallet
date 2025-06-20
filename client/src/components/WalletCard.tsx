import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { Wallet, Plus, IndianRupee } from "lucide-react";

export default function WalletCard() {
  const { user } = useAuth();
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
          <div className="bg-gradient-to-br from-tea-green/10 to-tea-light/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 font-medium">Current Balance</span>
              <IndianRupee className="w-5 h-5 text-tea-green" />
            </div>
            <div className="text-3xl font-bold text-tea-dark mb-2">
              ₹{parseFloat(user?.walletBalance || "0").toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Available for use</div>
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
