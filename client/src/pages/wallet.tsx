import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Wallet, Plus, IndianRupee, Building2, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function WalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { preparePayment, executePayment, preparing, loading } = useRazorpay();
  const [customAmount, setCustomAmount] = useState("");
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string>("");
  const [testMode, setTestMode] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Get pseudo parameter for business units query
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const pseudoParam = urlParams?.get('pseudo');
  const pseudoQuery = pseudoParam ? `?pseudo=${pseudoParam}` : '';

  // Build query key that includes user identifier to prevent cache conflicts
  const userIdentifier = pseudoParam || user?.id || 'anonymous';
  const businessUnitsQueryKey = `/api/corporate/business-units${pseudoQuery}`;

  // Check if user has business units assigned (with pseudo support)
  const { data: businessUnits = [], isLoading: unitsLoading } = useQuery({
    queryKey: [`business-units`, userIdentifier, businessUnitsQueryKey],
    queryFn: async () => {
      const response = await fetch(businessUnitsQueryKey, {
        credentials: 'include' // Include cookies for authentication
      });
      if (!response.ok) {
        throw new Error('Failed to fetch business units');
      }
      return response.json();
    },
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache for pseudo users (React Query v5 uses gcTime instead of cacheTime)
  });

  // Debug logging
  console.log('Wallet page debug:', {
    pseudoParam,
    pseudoQuery,
    userIdentifier,
    queryKey: businessUnitsQueryKey,
    businessUnits,
    unitsLoading,
    user
  });

  // Auto-select first business unit if user has only one
  useEffect(() => {
    if (businessUnits.length === 1 && !selectedBusinessUnitId) {
      setSelectedBusinessUnitId(businessUnits[0].id);
    }
  }, [businessUnits, selectedBusinessUnitId]);

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

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const quickAmounts = [100, 250, 500, 1000];

  const handleQuickRecharge = async (amount: number) => {
    if (!selectedBusinessUnitId) {
      toast({
        title: "Business Unit Required",
        description: "Please select a business unit to recharge",
        variant: "destructive",
      });
      return;
    }

    // Test mode: bypass Razorpay
    if (testMode) {
      try {
        setTestLoading(true);
        const res = await apiRequest("POST", "/api/wallet/test-payment", {
          amount,
          businessUnitId: selectedBusinessUnitId,
        });
        const result = await res.json();
        
        if (result.success) {
          toast({
            title: "Test Payment Successful! ✅",
            description: result.message,
          });
          
          // Refresh data
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
            }
          });
        } else {
          throw new Error(result.message || "Test payment failed");
        }
      } catch (error: any) {
        toast({
          title: "Test Payment Failed",
          description: error.message || "Failed to process test payment",
          variant: "destructive",
        });
      } finally {
        setTestLoading(false);
      }
      return;
    }

    // Normal Razorpay flow - prepare and execute synchronously
    try {
      const prepared = await preparePayment(amount, selectedBusinessUnitId, {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email || "",
        userId: user.id,  // Include userId for verification without auth session
      });

      if (prepared) {
        // 🚀 Pass order directly to maintain user gesture chain
        executePayment(prepared);
      }
    } catch (err) {
      console.error("Recharge error:", err);
    }
  };

  const handleCustomRecharge = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBusinessUnitId) {
      toast({
        title: "Business Unit Required",
        description: "Please select a business unit to recharge",
        variant: "destructive",
      });
      return;
    }
    
    // Test mode: bypass Razorpay
    if (testMode) {
      try {
        setTestLoading(true);
        const res = await apiRequest("POST", "/api/wallet/test-payment", {
          amount,
          businessUnitId: selectedBusinessUnitId,
        });
        const result = await res.json();
        
        if (result.success) {
          toast({
            title: "Test Payment Successful! ✅",
            description: result.message,
          });
          
          // Refresh data
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.startsWith('/api/corporate/business-units');
            }
          });
          
          setCustomAmount("");
        } else {
          throw new Error(result.message || "Test payment failed");
        }
      } catch (error: any) {
        toast({
          title: "Test Payment Failed",
          description: error.message || "Failed to process test payment",
          variant: "destructive",
        });
      } finally {
        setTestLoading(false);
      }
      return;
    }
    
    // Normal Razorpay flow - prepare and execute synchronously
    try {
      const prepared = await preparePayment(amount, selectedBusinessUnitId, {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email || "",
        userId: user.id,  // Include userId for verification without auth session
      });

      if (prepared) {
        // 🚀 Pass order directly to maintain user gesture chain
        executePayment(prepared);
        setCustomAmount("");
      }
    } catch (err) {
      console.error("Custom recharge error:", err);
    }
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
                <span>Business Unit Wallets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {businessUnits.length > 0 ? (
                <div className="space-y-4">
                  {businessUnits.map((businessUnit: any) => (
                    <div key={businessUnit.id} className="bg-gradient-to-br from-tea-green/10 to-tea-light/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-tea-green" />
                          <span className="font-medium text-gray-900">{businessUnit.name}</span>
                        </div>
                        <IndianRupee className="w-4 h-4 text-tea-green" />
                      </div>
                      <div className="text-2xl font-bold text-tea-dark">
                        ₹{parseFloat(businessUnit.walletBalance || "0").toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{businessUnit.code}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center">
                  <div className="text-gray-500 mb-2">No Business Units Assigned</div>
                  <div className="text-sm text-gray-400">Contact your administrator</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Recharge */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-tea-green" />
                  <span>Quick Recharge</span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-normal text-gray-600">
                  <FlaskConical className="w-4 h-4" />
                  <span>Test Mode</span>
                  <Switch
                    checked={testMode}
                    onCheckedChange={setTestMode}
                    data-testid="switch-test-mode"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testMode && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-amber-800">
                    <FlaskConical className="w-4 h-4" />
                    <span className="text-sm font-medium">Development Mode Active</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Payments will be simulated without Razorpay for testing purposes
                  </p>
                </div>
              )}
              
              {!testMode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> If you change your mind during payment, simply click your browser's back button to return to this page.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-12 text-lg hover:bg-tea-green hover:text-white hover:border-tea-green"
                    onClick={() => handleQuickRecharge(amount)}
                    disabled={loading || testLoading || businessUnits.length === 0 || (businessUnits.length > 1 && !selectedBusinessUnitId)}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
              
              {/* Show message if no business units */}
              {businessUnits.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 rounded-full bg-amber-400 flex-shrink-0 mt-0.5"></div>
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
              
              <div className="space-y-4">
                {/* Business Unit Selector */}
                {businessUnits.length > 1 && (
                  <div>
                    <Label htmlFor="business-unit-select">Select Business Unit to Recharge</Label>
                    <select 
                      id="business-unit-select"
                      value={selectedBusinessUnitId} 
                      onChange={(e) => setSelectedBusinessUnitId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent bg-white text-gray-900"
                    >
                      <option value="">Choose business unit to recharge</option>
                      {businessUnits.map((businessUnit: any) => (
                        <option key={businessUnit.id} value={businessUnit.id}>
                          {businessUnit.name} - ₹{parseFloat(businessUnit.walletBalance || "0").toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Business Unit Info Display */}
                {selectedBusinessUnitId && businessUnits.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Recharging: {businessUnits.find((bu: any) => bu.id === selectedBusinessUnitId)?.name}
                      </span>
                    </div>
                  </div>
                )}

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
                  disabled={preparing || loading || testLoading || !customAmount || businessUnits.length === 0 || (businessUnits.length > 1 && !selectedBusinessUnitId)}
                  data-testid="button-custom-recharge"
                >
                  {testLoading ? "Processing Test..." : preparing ? "Preparing..." : loading ? "Processing..." : selectedBusinessUnitId ? 
                    `${testMode ? 'Test ' : ''}Recharge ${businessUnits.find((bu: any) => bu.id === selectedBusinessUnitId)?.name || 'Business Unit'}` : 
                    "Recharge Wallet"
                  }
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

        {/* Quick link to Recharge History */}
        <Card className="shadow-material mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span>Need to check your recharge history?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View all your wallet recharge transactions across all business units in the dedicated recharge history page.
            </p>
            <Button 
              variant="outline" 
              className="border-tea-green text-tea-green hover:bg-tea-green hover:text-white"
              onClick={() => window.location.href = '/recharge-history'}
            >
              <Wallet className="w-4 h-4 mr-2" />
              View Recharge History
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
