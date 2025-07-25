import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Wallet, IndianRupee, AlertTriangle, Building2 } from "lucide-react";

export default function WalletCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get pseudo parameter for business units query  
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const pseudoParam = urlParams?.get('pseudo');
  const pseudoQuery = pseudoParam ? `?pseudo=${pseudoParam}` : '';

  // Build query key that includes user identifier to prevent cache conflicts
  const userIdentifier = pseudoParam || user?.id || 'anonymous';
  const businessUnitsQueryKey = `/api/corporate/business-units${pseudoQuery}`;

  // Check if user has business units assigned (with pseudo support)
  const { data: businessUnits = [] } = useQuery({
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
    gcTime: 0, // Don't cache for pseudo users
  });

  // Calculate if any business unit has low balance
  const LOW_BALANCE_THRESHOLD = 50.00;
  const hasLowBalance = businessUnits.some((unit: any) => parseFloat(unit.walletBalance || '0') <= LOW_BALANCE_THRESHOLD);
  const lowestBalance = businessUnits.length > 0 ? Math.min(...businessUnits.map((unit: any) => parseFloat(unit.walletBalance || '0'))) : 0;

  // Show low balance alert for business units
  useEffect(() => {
    if (hasLowBalance && businessUnits.length > 0) {
      toast({
        title: "Low Business Unit Balance",
        description: `One or more business units have low balance (₹${lowestBalance.toFixed(2)}). Visit Business Wallet to recharge.`,
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [hasLowBalance, lowestBalance, businessUnits.length, toast]);

  return (
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
            {businessUnits.map((businessUnit: any) => {
              const unitBalance = parseFloat(businessUnit.walletBalance || "0");
              const isUnitLowBalance = unitBalance <= LOW_BALANCE_THRESHOLD;
              
              return (
                <div 
                  key={businessUnit.id} 
                  className={`rounded-xl p-4 ${
                    isUnitLowBalance 
                      ? 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200' 
                      : 'bg-gradient-to-br from-tea-green/10 to-tea-light/10'
                  }`}
                >
                  {isUnitLowBalance && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <div className="text-xs text-red-700 font-medium">
                        Low Balance Alert!
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-tea-green" />
                      <span className="font-medium text-gray-900">{businessUnit.name}</span>
                    </div>
                    <IndianRupee className={`w-4 h-4 ${isUnitLowBalance ? 'text-red-500' : 'text-tea-green'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${
                    isUnitLowBalance ? 'text-red-600' : 'text-tea-dark'
                  }`}>
                    ₹{unitBalance.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">{businessUnit.code}</div>
                  <div className={`text-sm mt-1 ${isUnitLowBalance ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {isUnitLowBalance ? 'Recharge needed' : 'Available for employees'}
                  </div>
                </div>
              );
            })}
            
            {/* Recharge Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 rounded-full bg-blue-400 flex-shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">
                    Need to recharge?
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Visit the <strong>Business Wallet</strong> page to recharge any business unit wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center">
            <div className="text-gray-500 mb-2">No Business Units Assigned</div>
            <div className="text-sm text-gray-400">Contact your administrator to assign you to a business unit</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}