import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import WalletCard from "@/components/WalletCard";
import TransactionHistory from "@/components/TransactionHistory";
import RFIDCard from "@/components/RFIDCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Coffee, CreditCard, History, User, Plus, Headphones } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: dispensingHistory } = useQuery({
    queryKey: ["/api/dispensing/history"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const cupsToday = dispensingHistory?.filter((log: any) => {
    const today = new Date().toDateString();
    return new Date(log.createdAt).toDateString() === today;
  }).length || 0;

  const cupsThisWeek = dispensingHistory?.filter((log: any) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(log.createdAt) > weekAgo;
  }).length || 0;

  const cupsThisMonth = dispensingHistory?.filter((log: any) => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return new Date(log.createdAt) > monthAgo;
  }).length || 0;

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-tea-green to-tea-light rounded-2xl p-8 text-white shadow-material-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-inter font-bold mb-2">
                  Welcome back, {user.firstName || "Tea Lover"}!
                </h2>
                <p className="text-white/90 text-lg">Ready for your next cup of premium tea?</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{cupsToday}</div>
                  <div className="text-white/80 text-sm">Cups Today</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                    <CreditCard className="text-white text-lg" />
                  </div>
                  <div className="text-white/80 text-sm">RFID Active</div>
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
            <TransactionHistory />
          </div>

          {/* Right Column - RFID & Stats */}
          <div className="space-y-6">
            <RFIDCard />

            {/* Usage Statistics */}
            <Card className="shadow-material">
              <CardContent className="p-6">
                <h3 className="text-lg font-inter font-semibold text-gray-900 mb-6">Usage Statistics</h3>
                
                <div className="space-y-6">
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
                  
                  {/* Favorite Tea */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-gray-600 mb-2">Most Popular</div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full" />
                      <div>
                        <div className="font-medium text-gray-900">Earl Grey</div>
                        <div className="text-xs text-gray-500">{Math.floor(cupsThisMonth * 0.4)} times this month</div>
                      </div>
                    </div>
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
                    onClick={() => window.location.href = '/history'}
                  >
                    <div className="flex items-center space-x-3">
                      <History className="w-4 h-4" />
                      <span className="font-medium">View Full History</span>
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
            onClick={() => window.location.href = '/history'}
          >
            <History className="w-5 h-5" />
            <span className="text-xs font-medium">History</span>
          </button>
          <button className="flex flex-col items-center space-y-1 p-2 text-gray-400">
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
