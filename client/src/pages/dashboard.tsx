import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import WalletCard from "@/components/WalletCard";
import TransactionHistory from "@/components/TransactionHistory";

import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Coffee, CreditCard, History, User, Plus, Headphones, Building2, Activity, Wallet, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

// Define BusinessUnit type
interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  walletBalance: string;
}

// Balance Monitoring Overview Component
function BalanceMonitoringOverview({ businessUnits }: { businessUnits: BusinessUnit[] }) {
  if (businessUnits.length === 0) return null;

  // Function to get balance status and styling
  const getBalanceStatus = (balance: number) => {
    if (balance <= 100) {
      return {
        status: 'Critical',
        bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        badgeColor: 'bg-red-500 text-white'
      };
    } else if (balance <= 500) {
      return {
        status: 'Low Balance',
        bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        badgeColor: 'bg-yellow-500 text-white'
      };
    } else {
      return {
        status: 'Active',
        bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        badgeColor: 'bg-green-500 text-white'
      };
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Quick Overview:</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessUnits.map(unit => {
          const balance = parseFloat(unit.walletBalance || '0');
          const balanceStatus = getBalanceStatus(balance);
          
          return (
            <Card key={unit.id} className={`${balanceStatus.bgColor} ${balanceStatus.borderColor} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <Badge className={`${balanceStatus.badgeColor} text-xs`}>
                    {balanceStatus.status}
                  </Badge>
                </div>
                <div className="mb-2">
                  <h4 className={`font-bold text-lg ${balanceStatus.textColor}`}>
                    {unit.name}
                  </h4>
                </div>
                <div className={`text-2xl font-bold mb-1 ${balanceStatus.textColor}`}>
                  ₹{balance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {unit.code}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | null>(null);

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
  }, [isAuthenticated, isLoading]);

  // Queries with business unit filtering
  const { data: dispensingHistory } = useQuery({
    queryKey: ["/api/dispensing/history", selectedBusinessUnitId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedBusinessUnitId) {
        params.append('businessUnitId', selectedBusinessUnitId);
      }
      return fetch(`/api/dispensing/history?${params}`).then(res => res.json());
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats", selectedBusinessUnitId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedBusinessUnitId) {
        params.append('businessUnitId', selectedBusinessUnitId);
      }
      return fetch(`/api/dashboard/stats?${params}`).then(res => res.json());
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Get user's business units for balance monitoring
  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/corporate/business-units"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-warm flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tea-dark mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Use stats from API instead of client-side calculation
  const cupsToday = dashboardStats?.cupsToday || dashboardStats?.totalCupsToday || 0;
  const cupsThisWeek = dashboardStats?.cupsThisWeek || dashboardStats?.totalCupsThisWeek || 0;
  const cupsThisMonth = dashboardStats?.cupsThisMonth || dashboardStats?.totalCupsThisMonth || 0;
  const activeMachines = dashboardStats?.activeMachines || dashboardStats?.totalActiveMachines || 0;

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Monitoring Overview */}
        <BalanceMonitoringOverview businessUnits={businessUnits} />

        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-tea-dark to-tea-green rounded-2xl p-8 text-white shadow-material-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-inter font-bold mb-2 drop-shadow-sm text-[#A67C52]">
                  Welcome back, {user.firstName || "Tea Lover"}!
                </h2>
                {selectedBusinessUnitId && dashboardStats?.businessUnitName && (
                  <div className="bg-white/20 rounded-lg px-3 py-2 mt-2 inline-block">
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {dashboardStats.businessUnitName}
                    </p>
                    <p className="text-sm opacity-80">Business Unit Selected</p>
                  </div>
                )}
                {!selectedBusinessUnitId && (
                  <div className="bg-white/20 rounded-lg px-3 py-2 mt-2 inline-block">
                    <p className="text-lg font-semibold">All Business Units</p>
                    <p className="text-sm opacity-80">Aggregate View</p>
                  </div>
                )}
                <p className="text-lg drop-shadow-sm text-[#A67C52]">Ready for your next cup of premium tea?</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#A67C52]">{cupsToday}</div>
                  <div className="text-sm text-[#A67C52]">Cups Today</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                    <CreditCard className="text-white text-lg" />
                  </div>
                  <div className="text-sm text-[#A67C52]">RFID Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet & Transaction History */}
          <div className="lg:col-span-2 space-y-6">
            <WalletCard />
            <TransactionHistory businessUnitId={selectedBusinessUnitId} />
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Usage Statistics */}
            <Card className="shadow-material">
              <CardContent className="p-6">
                <h3 className="text-lg font-inter font-semibold text-gray-900 mb-6">Usage Statistics</h3>
                
                <div className="space-y-6">
                  {/* Today */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Today</span>
                      <span className="font-semibold text-gray-900">{cupsToday} cups</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-coffee h-2 rounded-full" 
                        style={{ width: `${Math.min((cupsToday / 5) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Daily goal: 5 cups</div>
                  </div>

                  {/* This Week */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">This Week</span>
                      <span className="font-semibold text-gray-900">{cupsThisWeek} cups</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-tea-green h-2 rounded-full" 
                        style={{ width: `${Math.min((cupsThisWeek / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Goal: 20 cups</div>
                  </div>
                  
                  {/* This Month */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">This Month</span>
                      <span className="font-semibold text-gray-900">{cupsThisMonth} cups</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-tea-light h-2 rounded-full" 
                        style={{ width: `${Math.min((cupsThisMonth / 60) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Average: 60 cups/month</div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-material">
              <CardContent className="p-6">
                <h3 className="text-lg font-inter font-semibold text-gray-900 mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-between bg-tea-green/10 text-tea-dark hover:bg-tea-green hover:text-white"
                    onClick={() => window.location.href = '/wallet'}
                  >
                    <div className="flex items-center space-x-3">
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Recharge Wallet</span>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => window.location.href = '/profile'}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Update Profile</span>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => window.location.href = '/support'}
                  >
                    <div className="flex items-center space-x-3">
                      <Headphones className="w-4 h-4" />
                      <span className="font-medium">Support</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button className="flex flex-col items-center space-y-1 p-2 text-tea-green">
            <Coffee className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            className="flex flex-col items-center space-y-1 p-2 text-gray-400"
            onClick={() => window.location.href = '/wallet'}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Wallet</span>
          </button>

          <button 
            className="flex flex-col items-center space-y-1 p-2 text-gray-400"
            onClick={() => window.location.href = '/profile'}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
          <button 
            className="flex flex-col items-center space-y-1 p-2 text-gray-400"
            onClick={() => window.location.href = '/support'}
          >
            <Headphones className="w-5 h-5" />
            <span className="text-xs font-medium">Support</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
