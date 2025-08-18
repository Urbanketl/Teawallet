import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  Shield,
  Settings,
  CreditCard,
  Building2,
  MessageCircle,
  HelpCircle,
  RefreshCw
} from "lucide-react";

// Import focused components
import UserManagement from "./UserManagement";
import RFIDCardManager from "./RFIDCardManager";
import BusinessUnitAdmin from "./BusinessUnitAdmin";
import SystemSettings from "./SystemSettings";

// Import existing components that haven't been refactored yet
import { BusinessUnitsTab } from "@/components/BusinessUnitsTab";
import { PseudoLogin } from "@/components/PseudoLogin";
import MachineSyncDashboard from "@/pages/machine-sync-dashboard";

// Overview Dashboard Component
function OverviewDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard-stats", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Platform Overview</h3>
        <p className="text-sm text-muted-foreground">
          System-wide statistics and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{stats?.totalUsers || 0}</span>
                  <Users className="ml-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Business Units</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{stats?.totalBusinessUnits || 0}</span>
                  <Building2 className="ml-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Active Machines</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{stats?.activeMachines || 0}</span>
                  <Coffee className="ml-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">RFID Cards</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{stats?.totalRFIDCards || 0}</span>
                  <CreditCard className="ml-2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentTransactions?.map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{transaction.businessUnitName}</p>
                    <p className="text-sm text-muted-foreground">{transaction.machineName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{transaction.amount}</p>
                    <p className="text-sm text-muted-foreground">{transaction.timeAgo}</p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-4">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.systemAlerts?.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.timeAgo}</p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-4">No system alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("overview");

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
                <p className="text-gray-600">Manage users, business units, machines, and system settings</p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Selector */}
          <div className="sm:hidden mb-6">
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Admin Panel</h3>
                </div>

                <select 
                  value={currentTab}
                  onChange={(e) => setCurrentTab(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="overview">📊 Overview Dashboard</option>
                  <option value="users">👥 User Management</option>
                  <option value="business-units">🏢 Business Units</option>
                  <option value="rfid">💳 RFID Cards</option>
                  <option value="machines">☕ Tea Machines</option>
                  <option value="machine-sync">🔧 Machine Sync</option>
                  <option value="support">📞 Support Tickets</option>
                  <option value="reports">📊 Reports & Export</option>
                  <option value="faq">❓ FAQ Management</option>
                  <option value="pseudo-login">🔓 Test Login</option>
                  <option value="settings">⚙️ System Settings</option>
                </select>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Tabs Interface */}
          <div className="hidden sm:block mb-8">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                <div className="flex overflow-x-auto">
                  {[
                    { id: "overview", label: "📊 Overview", icon: TrendingUp },
                    { id: "users", label: "👥 Users", icon: Users },
                    { id: "business-units", label: "🏢 Business Units", icon: Building2 },
                    { id: "rfid", label: "💳 RFID Cards", icon: CreditCard },
                    { id: "machines", label: "☕ Machines", icon: Coffee },
                    { id: "machine-sync", label: "🔧 Sync", icon: RefreshCw },
                    { id: "support", label: "📞 Support", icon: MessageCircle },
                    { id: "reports", label: "📊 Reports", icon: TrendingUp },
                    { id: "faq", label: "❓ FAQ", icon: HelpCircle },
                    { id: "pseudo-login", label: "🔓 Test", icon: Shield },
                    { id: "settings", label: "⚙️ Settings", icon: Settings },
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setCurrentTab(tab.id)}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        currentTab === tab.id
                          ? "border-orange-500 text-orange-600 bg-orange-50" 
                          : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              {currentTab === "overview" && <OverviewDashboard />}
              {currentTab === "users" && <UserManagement />}
              {currentTab === "business-units" && <BusinessUnitAdmin />}
              {currentTab === "rfid" && <RFIDCardManager />}
              {currentTab === "settings" && <SystemSettings />}
              
              {/* Legacy components that haven't been refactored yet */}
              {currentTab === "machines" && (
                <div className="text-center py-8">
                  <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Management</h3>
                  <p className="text-gray-600">This section is being refactored. Please use the legacy admin interface for now.</p>
                </div>
              )}
              {currentTab === "machine-sync" && <MachineSyncDashboard />}
              {currentTab === "support" && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Tickets</h3>
                  <p className="text-gray-600">This section is being refactored. Please use the legacy admin interface for now.</p>
                </div>
              )}
              {currentTab === "reports" && (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Analytics</h3>
                  <p className="text-gray-600">This section is being refactored. Please use the legacy admin interface for now.</p>
                </div>
              )}
              {currentTab === "faq" && (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQ Management</h3>
                  <p className="text-gray-600">This section is being refactored. Please use the legacy admin interface for now.</p>
                </div>
              )}
              {currentTab === "pseudo-login" && <PseudoLogin onLogin={(userId: string) => {
                console.log('Admin pseudo login for user:', userId);
                // Handle pseudo login if needed
              }} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}