import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  IndianRupee, 
  Coffee, 
  TrendingUp, 
  Download, 
  Settings,
  UserCheck,
  Activity
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPage() {
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

  // Check if user is admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [user, toast]);

  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">System overview and management</p>
          </div>
          <div className="flex space-x-3">
            <Button className="bg-tea-green hover:bg-tea-dark">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-blue-600 text-sm font-medium">+12%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : adminStats?.totalUsers || 0}
              </div>
              <div className="text-gray-600">Total Users</div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-600 text-sm font-medium">+8%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{statsLoading ? "..." : parseFloat(adminStats?.totalRevenue || "0").toFixed(2)}
              </div>
              <div className="text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>

          {/* Active Machines */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
                <span className="text-purple-600 text-sm font-medium">98%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : `${adminStats?.activeMachines || 0}/${machines?.length || 0}`}
              </div>
              <div className="text-gray-600">Active Machines</div>
            </CardContent>
          </Card>

          {/* Daily Dispensing */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-orange-600 text-sm font-medium">+15%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : adminStats?.dailyDispensing || 0}
              </div>
              <div className="text-gray-600">Cups Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-tea-green" />
                <span>Recent Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : !allUsers || allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allUsers.slice(0, 10).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">₹{parseFloat(user.walletBalance || "0").toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(user.createdAt), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Machine Status */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-tea-green" />
                <span>Machine Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {machinesLoading ? (
                <div className="text-center py-8">Loading machines...</div>
              ) : !machines || machines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No machines found</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {machines.map((machine: any) => (
                    <div key={machine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${machine.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <div className="font-medium text-sm">{machine.name}</div>
                          <div className="text-xs text-gray-500">{machine.location}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={machine.isActive ? "default" : "destructive"} className="text-xs">
                          {machine.isActive ? "Online" : "Offline"}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {machine.lastPing ? format(new Date(machine.lastPing), 'h:mm a') : 'Never'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
