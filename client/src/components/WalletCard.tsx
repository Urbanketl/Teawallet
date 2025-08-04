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

  return null;
}