import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed Dialog import - using custom modal instead
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Plus, IndianRupee, AlertTriangle, CreditCard, Minus } from "lucide-react";

export default function WalletCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has business units assigned
  const { data: businessUnits = [] } = useQuery({
    queryKey: ["/api/corporate/business-units"],
    retry: false,
  });
  
  const balance = parseFloat(user?.walletBalance || '0');
  const LOW_BALANCE_THRESHOLD = 50.00;
  const isLowBalance = balance <= LOW_BALANCE_THRESHOLD;

  // Get system settings for max wallet balance
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  const maxWalletBalance = systemSettings?.find(s => s.key === 'max_wallet_balance')?.value || '9000.00';
  const maxAllowedRecharge = parseFloat(maxWalletBalance) - balance;
  
  // Show low balance alert
  useEffect(() => {
    if (isLowBalance && balance > 0) {
      toast({
        title: "Low Business Unit Balance",
        description: `Your business unit balance is ₹${balance.toFixed(2)}. Recharge now to avoid interruption for your employees!`,
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
    console.log("Quick recharge clicked for amount:", amount);
    if (loading) {
      console.warn("Payment already in progress, ignoring quick recharge click");
      return;
    }
    
    initiatePayment(amount, {
      name: `${user?.firstName} ${user?.lastName}`.trim(),
      email: user?.email || "",
    });
  };

  const handleCustomRecharge = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Initiating custom recharge for amount:", amount);
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
          <span>Business Unit Wallet</span>
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
                  Low Business Unit Balance Alert!
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 font-medium">Business Unit Balance</span>
              <IndianRupee className={`w-5 h-5 ${isLowBalance ? 'text-red-500' : 'text-tea-green'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              isLowBalance ? 'text-red-600' : 'text-tea-dark'
            }`}>
              ₹{balance.toFixed(2)}
            </div>
            <div className={`text-sm ${isLowBalance ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
              {isLowBalance ? 'Recharge needed for employee tea access' : 'Available for employee tea purchases'}
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
                  disabled={loading || businessUnits.length === 0}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
            
            <Button 
              className="w-full bg-tea-green hover:bg-tea-dark"
              onClick={() => setDialogOpen(true)}
              disabled={businessUnits.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom Amount
            </Button>
            
            {/* Show message if no business units */}
            {businessUnits.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      No Business Units Assigned
                    </p>
                    <p className="text-xs text-amber-700">
                      You need to be assigned to a business unit before you can recharge your wallet. 
                      Please contact your administrator to assign you to a business unit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Modal */}
            {dialogOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Recharge Wallet</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter a custom amount to add to your wallet balance.
                      </p>
                    </div>

                    {/* Information about maximum recharge */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 h-4 rounded-full bg-blue-400 flex-shrink-0 mt-0.5"></div>
                        <div className="flex-1">
                          <p className="text-sm text-blue-800 font-medium">
                            Recharge Information
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Business Unit Balance: ₹{balance.toFixed(2)}<br />
                            Maximum Wallet Limit: ₹{parseFloat(maxWalletBalance).toFixed(2)}<br />
                            Maximum you can add: ₹{maxAllowedRecharge > 0 ? maxAllowedRecharge.toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="custom-amount">Enter Amount (₹)</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseFloat(customAmount) || 0;
                            const newAmount = Math.max(0, current - 100);
                            setCustomAmount(newAmount.toString());
                          }}
                          disabled={loading}
                          className="h-10 w-10 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          id="custom-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          min="1"
                          step="100"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseFloat(customAmount) || 0;
                            const newAmount = current + 100;
                            // Don't exceed maximum allowed recharge
                            const maxAmount = Math.min(newAmount, maxAllowedRecharge);
                            setCustomAmount(maxAmount > 0 ? maxAmount.toString() : "100");
                          }}
                          disabled={loading}
                          className="h-10 w-10 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use +/- buttons to adjust by ₹100 increments
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDialogOpen(false);
                          setCustomAmount("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-tea-green hover:bg-tea-dark"
                        onClick={handleCustomRecharge}
                        disabled={loading || !customAmount}
                      >
                        {loading ? "Processing..." : "Recharge Now"}
                      </Button>
                    </div>
                    {loading && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 mt-0.5 animate-pulse"></div>
                          <div className="flex-1">
                            <p className="text-sm text-amber-800 font-medium mb-1">
                              Opening payment window...
                            </p>
                            <p className="text-xs text-amber-700 mb-3">
                              If payment window doesn't appear within 3 seconds:
                              <br />• Your browser might be blocking popups
                              <br />• A new tab will open automatically
                              <br />• Or click the button below to open payment manually
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Force open payment in new tab
                                  const lastOrder = JSON.parse(localStorage.getItem('lastPaymentOrder') || '{}');
                                  if (lastOrder.id) {
                                    window.open(`https://razorpay.com/payment-link/${lastOrder.id}`, '_blank');
                                  }
                                }}
                                className="text-xs"
                              >
                                Open Payment Manually
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.reload()}
                                className="text-xs"
                              >
                                Cancel & Refresh
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
