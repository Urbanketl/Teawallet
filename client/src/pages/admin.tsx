import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  IndianRupee, 
  Coffee, 
  TrendingUp, 
  Download, 
  Settings,
  UserCheck,
  Activity,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  UserPlus,
  UserMinus,
  Shield,
  Eye,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search
} from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    teaPrice: "5.00",
    maintenanceMode: false,
    autoRecharge: true,
    maxWalletBalance: "5000.00",
    lowBalanceThreshold: "50.00",
    systemName: "UrbanKetl Tea System"
  });

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsStatus, setTicketsStatus] = useState("all");
  const usersPerPage = 50;
  const ticketsPerPage = 20;

  // Load system settings from database
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  // Paginated users query
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", { paginated: true, page: usersPage, limit: usersPerPage, search: usersSearch }],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  // Paginated support tickets query
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: [`/api/admin/support/tickets?paginated=true&page=${ticketsPage}&limit=${ticketsPerPage}${ticketsStatus ? `&status=${ticketsStatus}` : ''}`],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  // Update settings state when database values are loaded
  useEffect(() => {
    if (systemSettings && Array.isArray(systemSettings)) {
      const maxWalletSetting = systemSettings.find(s => s.key === 'max_wallet_balance');
      if (maxWalletSetting) {
        setSettings(prev => ({
          ...prev,
          maxWalletBalance: maxWalletSetting.value
        }));
      }
    }
  }, [systemSettings]);

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

  const { data: allUsers, isLoading: allUsersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
  });

  const queryClient = useQueryClient();

  // State declarations first
  const [statusUpdateDialogs, setStatusUpdateDialogs] = useState<{ [key: number]: boolean }>({});
  const [statusUpdateData, setStatusUpdateData] = useState<{ [key: number]: { status: string; comment: string } }>({});
  const [historyDialogs, setHistoryDialogs] = useState<{ [key: number]: boolean }>({});
  const [ticketHistories, setTicketHistories] = useState<{ [key: number]: any[] }>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const { data: supportTickets = [], isLoading: allTicketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["/api/admin/support/tickets"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
    refetchInterval: 5000,
  });

  // Debug logging
  console.log('Support tickets data:', supportTickets);
  console.log('Support tickets loading:', allTicketsLoading);
  console.log('Support tickets type:', typeof supportTickets);
  console.log('Support tickets is array:', Array.isArray(supportTickets));

  const { data: ticketMessages = [], refetch: refetchTicketMessages } = useQuery({
    queryKey: [`/api/support/tickets/${selectedTicketId}/messages`],
    enabled: !!selectedTicketId,
    refetchInterval: selectedTicketId ? 3000 : false,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, status, assignedTo, comment }: { ticketId: number; status?: string; assignedTo?: string; comment?: string }) => {
      return apiRequest('PATCH', `/api/admin/support/tickets/${ticketId}`, { status, assignedTo, comment });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ticket updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setStatusUpdateDialogs({});
      setStatusUpdateData({});
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update ticket",
        variant: "destructive" 
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      if (!selectedTicketId) {
        throw new Error('No ticket selected');
      }
      return apiRequest('POST', `/api/support/tickets/${selectedTicketId}/messages`, {
        ...messageData,
        isFromSupport: true
      });
    },
    onSuccess: () => {
      refetchTicketMessages();
      refetchTickets();
      setNewMessage('');
      toast({ title: "Success", description: "Message sent successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || 'Failed to send message',
        variant: "destructive" 
      });
    },
  });



  const handleStatusChange = (ticketId: number, newStatus: string) => {
    setStatusUpdateData({
      ...statusUpdateData,
      [ticketId]: { status: newStatus, comment: '' }
    });
    setStatusUpdateDialogs({
      ...statusUpdateDialogs,
      [ticketId]: true
    });
  };

  const confirmStatusUpdate = (ticketId: number) => {
    const data = statusUpdateData[ticketId];
    if (!data?.comment.trim()) {
      toast({
        title: "Error",
        description: "Comment is required when changing ticket status",
        variant: "destructive"
      });
      return;
    }
    
    updateTicketMutation.mutate({
      ticketId,
      status: data.status,
      comment: data.comment
    });
  };

  const fetchTicketHistory = async (ticketId: number) => {
    try {
      console.log('Fetching history for ticket ID:', ticketId);
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/history`, {
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const history = await response.json();
        console.log('Received history data:', history);
        setTicketHistories(prev => ({ ...prev, [ticketId]: history }));
        setHistoryDialogs(prev => ({ ...prev, [ticketId]: true }));
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        toast({
          title: "Error",
          description: "Failed to fetch ticket history",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch ticket history",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterTicketsByDate = (tickets: any[]) => {
    if (dateFilter === 'all') return tickets;
    
    const now = new Date();
    let startDate: Date;
    
    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (!customDateRange.start) return tickets;
        startDate = new Date(customDateRange.start);
        const endDate = customDateRange.end ? new Date(customDateRange.end) : now;
        return tickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= startDate && ticketDate <= endDate;
        });
      default:
        return tickets;
    }
    
    return tickets.filter(ticket => new Date(ticket.createdAt) >= startDate);
  };

  // Additional debug logging after function definition
  console.log('Filtered tickets count:', supportTickets ? filterTicketsByDate(supportTickets).length : 0);
  console.log('Date filter:', dateFilter);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
            <Button 
              variant="outline"
              onClick={() => {
                console.log("Settings button clicked", settingsOpen);
                setSettingsOpen(true);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>

            {/* Settings Modal */}
            {settingsOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">System Settings</h2>
                    <p className="text-gray-600 text-sm">Configure system-wide settings for the UrbanKetl tea dispensing system.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="systemName">System Name</Label>
                      <Input
                        id="systemName"
                        value={settings.systemName}
                        onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="teaPrice">Tea Price (₹)</Label>
                      <Input
                        id="teaPrice"
                        type="number"
                        step="0.01"
                        value={settings.teaPrice}
                        onChange={(e) => setSettings({...settings, teaPrice: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxBalance">Max Wallet (₹)</Label>
                      <Input
                        id="maxBalance"
                        type="number"
                        step="0.01"
                        value={settings.maxWalletBalance}
                        onChange={(e) => setSettings({...settings, maxWalletBalance: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="lowBalance">Low Balance Alert (₹)</Label>
                      <Input
                        id="lowBalance"
                        type="number"
                        step="0.01"
                        value={settings.lowBalanceThreshold}
                        onChange={(e) => setSettings({...settings, lowBalanceThreshold: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance">Maintenance Mode</Label>
                      <Switch
                        id="maintenance"
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoRecharge">Auto Recharge</Label>
                      <Switch
                        id="autoRecharge" 
                        checked={settings.autoRecharge}
                        onCheckedChange={(checked) => setSettings({...settings, autoRecharge: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          console.log('Saving settings:', settings.maxWalletBalance);
                          
                          // Update max wallet balance in database
                          const response = await fetch('/api/admin/settings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              key: 'max_wallet_balance', 
                              value: parseFloat(settings.maxWalletBalance).toFixed(2) 
                            }),
                            credentials: 'include'
                          });

                          console.log('Save response status:', response.status);
                          
                          if (!response.ok) {
                            const errorData = await response.text();
                            console.error('Save failed:', errorData);
                            throw new Error(`Failed to update setting: ${response.status}`);
                          }

                          console.log('Settings saved successfully, refreshing cache...');

                          // Force refresh all settings-related queries
                          await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
                          await queryClient.refetchQueries({ queryKey: ["/api/admin/settings"] });

                          console.log('Cache refreshed, showing success message...');

                          toast({
                            title: "Settings Updated Successfully",
                            description: `Maximum wallet balance is now ₹${settings.maxWalletBalance}. Payment validation will use this new limit immediately.`,
                          });
                          
                          setSettingsOpen(false);
                          
                        } catch (error) {
                          console.error('Settings save error:', error);
                          toast({
                            title: "Update Failed",
                            description: `Failed to save system settings: ${error.message}`,
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-tea-green hover:bg-tea-dark"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
              <div className="text-gray-600">Total Business Units</div>
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

        {/* Tabs Interface */}
        <Tabs defaultValue="overview" className="space-y-6 mt-12">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rfid">RFID Cards</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="support">Support Tickets</TabsTrigger>
            <TabsTrigger value="faq">FAQ Management</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview Dashboard</h3>
              <p className="text-gray-600">System statistics and insights displayed above</p>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="rfid">
            <RfidManagement />
          </TabsContent>

          <TabsContent value="machines">
            <MachineManagement />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
              <div className="flex items-center space-x-4">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                  {ticketsData?.tickets?.length || 0} / {ticketsData?.total || 0} Tickets (Page {ticketsPage})
                </Badge>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <Card className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </Card>
            )}

            <div className="grid gap-4">
              {allTicketsLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    Loading support tickets...
                  </CardContent>
                </Card>
              ) : !ticketsData?.tickets || ticketsData.tickets.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No support tickets found for the selected date range</p>
                  </CardContent>
                </Card>
              ) : (
                (ticketsData?.tickets || []).map((ticket: any) => {
                  console.log('Rendering ticket:', ticket.id, 'with status:', ticket.status);
                  return (
                    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                          <Badge className={`${getStatusColor(ticket.status)} border-0`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(ticket.status)}
                              <span className="capitalize">{ticket.status}</span>
                            </div>
                          </Badge>
                          <Badge className={`${getPriorityColor(ticket.priority)} border-0`}>
                            {ticket.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>From: {ticket.user?.firstName} {ticket.user?.lastName}</span>
                          <span>•</span>
                          <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy h:mm a')}</span>
                          <span>•</span>
                          <span>#{ticket.id}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="relative">
                          <select
                            value={ticket.status}
                            onChange={(e) => {
                              console.log("Status change triggered:", ticket.id, "->", e.target.value);
                              handleStatusChange(ticket.id, e.target.value);
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>

                        {/* Status Update Modal */}
                        {statusUpdateDialogs[ticket.id] && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                              <div className="mb-4">
                                <h2 className="text-xl font-semibold">Update Ticket Status</h2>
                                <p className="text-gray-600 text-sm">Please provide a comment explaining the status change.</p>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <Label>Status Change</Label>
                                  <p className="text-sm text-gray-600">
                                    {ticket.status} → {statusUpdateData[ticket.id]?.status}
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor={`comment-${ticket.id}`}>Comment *</Label>
                                  <Textarea
                                    id={`comment-${ticket.id}`}
                                    placeholder="Enter reason for status change..."
                                    value={statusUpdateData[ticket.id]?.comment || ''}
                                    onChange={(e) => setStatusUpdateData({
                                      ...statusUpdateData,
                                      [ticket.id]: {
                                        ...statusUpdateData[ticket.id],
                                        comment: e.target.value
                                      }
                                    })}
                                    rows={3}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end space-x-2 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={() => setStatusUpdateDialogs({
                                    ...statusUpdateDialogs,
                                    [ticket.id]: false
                                  })}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => confirmStatusUpdate(ticket.id)}
                                  disabled={updateTicketMutation.isPending}
                                  className="bg-tea-green hover:bg-tea-dark"
                                >
                                  {updateTicketMutation.isPending ? "Updating..." : "Update Status"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(ticket.id, 'closed')}
                          disabled={ticket.status === 'closed' || updateTicketMutation.isPending}
                        >
                          Close Ticket
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log("View History button clicked for ticket:", ticket.id);
                            fetchTicketHistory(ticket.id);
                          }}
                        >
                          View History
                        </Button>
                        <Button
                          onClick={() => setSelectedTicketId(selectedTicketId === ticket.id ? null : ticket.id)}
                          variant={selectedTicketId === ticket.id ? "default" : "outline"}
                          size="sm"
                        >
                          {selectedTicketId === ticket.id ? 'Hide Chat' : 'View Chat'}
                        </Button>

                        {/* Ticket History Modal */}
                        {historyDialogs[ticket.id] && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                              <div className="mb-4">
                                <h2 className="text-xl font-semibold">Ticket Status History - #{ticket.id}</h2>
                                <p className="text-gray-600 text-sm">View all status changes and admin comments for this ticket.</p>
                              </div>
                              
                              <div className="max-h-96 overflow-y-auto space-y-4 mb-6">
                                {ticketHistories[ticket.id]?.length > 0 ? (
                                  ticketHistories[ticket.id].map((history: any, index: number) => (
                                    <div key={index} className="border-l-4 border-tea-green pl-4 py-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline" className="text-xs">
                                            {history.oldStatus} → {history.newStatus}
                                          </Badge>
                                          <span className="text-sm font-medium">
                                            {history.updater?.firstName} {history.updater?.lastName}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {format(new Date(history.createdAt), 'MMM dd, yyyy h:mm a')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        {history.comment}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    No status change history found for this ticket.
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setHistoryDialogs(prev => ({ ...prev, [ticket.id]: false }))}
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversation Panel */}
                    {selectedTicketId === ticket.id && (
                      <div className="mt-6 border-t pt-6">
                        <h4 className="font-semibold mb-4">Conversation</h4>
                        <Card className="h-96 flex flex-col">
                          <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {ticketMessages.length === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No messages yet. Start the conversation!</p>
                              </div>
                            ) : (
                              ticketMessages.map((message: any) => (
                                <div 
                                  key={message.id}
                                  className={`flex ${message.isFromSupport ? 'justify-start' : 'justify-end'}`}
                                >
                                  <div 
                                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                                      message.isFromSupport 
                                        ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                                        : 'bg-green-50 border border-green-200 text-green-900'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className={`text-xs font-medium ${
                                        message.isFromSupport ? 'text-blue-600' : 'text-green-600'
                                      }`}>
                                        {message.isFromSupport ? '🎧 Support Admin' : '👤 Customer'}
                                      </span>
                                    </div>
                                    <p className="text-sm">{message.message}</p>
                                    <p className={`text-xs mt-1 ${
                                      message.isFromSupport ? 'text-blue-500' : 'text-green-500'
                                    }`}>
                                      {message.sender ? `${message.sender.firstName} ${message.sender.lastName} - ` : ''}
                                      {format(new Date(message.createdAt), 'MMM dd, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="p-4 border-t">
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Type your response..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newMessage.trim()) {
                                    sendMessageMutation.mutate({ message: newMessage });
                                  }
                                }}
                              />
                              <Button
                                onClick={() => {
                                  if (newMessage.trim()) {
                                    sendMessageMutation.mutate({ message: newMessage });
                                  }
                                }}
                                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                              >
                                Send
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                    </CardContent>
                    </Card>
                  );
                })
                )}
              </div>

              {/* Pagination for Support Tickets */}
              {ticketsData && ticketsData.total > ticketsPerPage && (
                <div className="mt-6">
                  <Pagination
                    currentPage={ticketsPage}
                    totalPages={Math.ceil(ticketsData.total / ticketsPerPage)}
                    onPageChange={setTicketsPage}
                    totalItems={ticketsData.total}
                    itemsPerPage={ticketsPerPage}
                  />
                </div>
              )}
            </TabsContent>
          <TabsContent value="faq">
            <FaqManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettingsManagement />
          </TabsContent>
          
          </Tabs>
        </main>
      </div>
    );
  }

function MachineManagement() {
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [machinePrice, setMachinePrice] = useState("5.00");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    retry: false,
  });

  const updateMachinePriceMutation = useMutation({
    mutationFn: async ({ machineId, price }: { machineId: string; price: string }) => {
      return apiRequest('PATCH', `/api/admin/machines/${machineId}/pricing`, {
        teaTypes: [{ name: "Regular Tea", price: price }]
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tea price updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      setEditingMachine(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update tea price",
        variant: "destructive" 
      });
    }
  });

  const startPriceEdit = (machine: any) => {
    setEditingMachine(machine);
    // Extract current price from tea_types if available
    const currentPrice = machine.teaTypes?.[0]?.price || "5.00";
    setMachinePrice(currentPrice);
  };

  const handlePriceUpdate = () => {
    if (!machinePrice || parseFloat(machinePrice) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      });
      return;
    }
    updateMachinePriceMutation.mutate({ 
      machineId: editingMachine.id, 
      price: parseFloat(machinePrice).toFixed(2) 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Machine Management & Pricing</h3>
          <p className="text-sm text-muted-foreground">
            Manage tea machines and set pricing for "Regular Tea" served by each machine
          </p>
        </div>
        <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
          {machines.length} Machines
        </Badge>
      </div>

      {machinesLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading machines...
          </CardContent>
        </Card>
      ) : !machines || machines.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tea machines found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {machines.map((machine: any) => (
            <Card key={machine.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${machine.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div>
                      <h4 className="font-semibold text-lg">{machine.name}</h4>
                      <p className="text-gray-600 text-sm">{machine.location}</p>
                      <p className="text-xs text-gray-500">ID: {machine.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <Badge variant={machine.isActive ? "default" : "destructive"} className="mb-2">
                        {machine.isActive ? "Online" : "Offline"}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Last ping: {machine.lastPing ? format(new Date(machine.lastPing), 'h:mm a') : 'Never'}
                      </p>
                    </div>
                    
                    <div className="text-center border-l pl-6">
                      <div className="text-lg font-bold text-tea-green">
                        ₹{machine.teaTypes?.[0]?.price || "5.00"}
                      </div>
                      <p className="text-xs text-gray-500">per cup</p>
                      <p className="text-xs text-gray-600 font-medium">Regular Tea</p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startPriceEdit(machine)}
                      className="flex items-center space-x-2"
                    >
                      <IndianRupee className="w-4 h-4" />
                      <span>Edit Price</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Price Edit Modal */}
      {editingMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Update Tea Price</h2>
              <p className="text-gray-600 text-sm">
                Set the price per cup for "{editingMachine.name}"
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="machineInfo">Machine Details</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{editingMachine.name}</p>
                  <p className="text-sm text-gray-600">{editingMachine.location}</p>
                  <p className="text-xs text-gray-500">ID: {editingMachine.id}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="teaType">Tea Type</Label>
                <Input
                  value="Regular Tea"
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Only "Regular Tea" is served by all machines</p>
              </div>
              
              <div>
                <Label htmlFor="price">Price per Cup (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={machinePrice}
                  onChange={(e) => setMachinePrice(e.target.value)}
                  placeholder="5.00"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the price in rupees (e.g., 5.00)</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditingMachine(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePriceUpdate}
                disabled={updateMachinePriceMutation.isPending}
                className="bg-tea-green hover:bg-tea-dark"
              >
                {updateMachinePriceMutation.isPending ? "Updating..." : "Update Price"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FaqManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqData, setFaqData] = useState({ question: '', answer: '', category: 'general' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: faqList = [], refetch: refetchFaq } = useQuery({
    queryKey: ['/api/faq'],
    refetchInterval: 5000,
  });

  const createFaqMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string; category: string }) => {
      return apiRequest('POST', '/api/admin/faq', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ created successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
      setShowCreateForm(false);
      setFaqData({ question: '', answer: '', category: 'general' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create FAQ",
        variant: "destructive" 
      });
    }
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { question: string; answer: string; category: string } }) => {
      return apiRequest('PATCH', `/api/admin/faq/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ updated successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
      setEditingFaq(null);
      setFaqData({ question: '', answer: '', category: 'general' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update FAQ",
        variant: "destructive" 
      });
    }
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/faq/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ deleted successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete FAQ",
        variant: "destructive" 
      });
    }
  });

  const handleCreate = () => {
    if (!faqData.question.trim() || !faqData.answer.trim()) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive"
      });
      return;
    }
    createFaqMutation.mutate(faqData);
  };

  const handleUpdate = () => {
    if (!faqData.question.trim() || !faqData.answer.trim()) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive"
      });
      return;
    }
    updateFaqMutation.mutate({ id: editingFaq.id, data: faqData });
  };

  const startEdit = (faq: any) => {
    setEditingFaq(faq);
    setFaqData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general'
    });
    setShowCreateForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this FAQ? This action cannot be undone.")) {
      deleteFaqMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingFaq(null);
    setFaqData({ question: '', answer: '', category: 'general' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">FAQ Management</h3>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage frequently asked questions
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New FAQ
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingFaq ? 'Edit FAQ' : 'Create New FAQ'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select 
                value={faqData.category} 
                onChange={(e) => setFaqData({...faqData, category: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="rfid">RFID Cards</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Question *</label>
              <input
                type="text"
                value={faqData.question}
                onChange={(e) => setFaqData({...faqData, question: e.target.value})}
                placeholder="Enter the FAQ question..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Answer *</label>
              <textarea
                value={faqData.answer}
                onChange={(e) => setFaqData({...faqData, answer: e.target.value})}
                placeholder="Enter the answer..."
                className="w-full p-2 border rounded-md"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={editingFaq ? handleUpdate : handleCreate}
                disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
              >
                {editingFaq ? (updateFaqMutation.isPending ? "Updating..." : "Update FAQ") : (createFaqMutation.isPending ? "Creating..." : "Create FAQ")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing FAQs ({Array.isArray(faqList) ? faqList.length : 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(faqList) && faqList.length > 0 ? (
              faqList.map((faq: any) => (
                <div key={faq.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{faq.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Views: {faq.views || 0}
                        </span>
                      </div>
                      <h4 className="font-medium text-lg">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEdit(faq)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(faq.id)}
                        disabled={deleteFaqMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No FAQ articles found. Create your first FAQ to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management Component
function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const usersLimit = 20;

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: [`/api/admin/users?paginated=true&page=${usersPage}&limit=${usersLimit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`],
    enabled: !!currentUser?.isAdmin,
  });

  // Admin status toggle mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await fetch(`/api/admin/users/${userId}/admin-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAdmin }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update admin status');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser, { isAdmin }) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0]?.toString()?.includes('/api/admin/users') || false
      });
      toast({
        title: "Success",
        description: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  const handleToggleAdmin = (user: any) => {
    const newAdminStatus = !user.isAdmin;
    const action = newAdminStatus ? 'grant' : 'revoke';
    
    if (confirm(`Are you sure you want to ${action} admin privileges for ${user.firstName} ${user.lastName}?`)) {
      toggleAdminMutation.mutate({ userId: user.id, isAdmin: newAdminStatus });
    }
  };

  const filteredUsers = (usersData as any)?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and admin privileges
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
            {(usersData as any)?.total || 0} Total Users
          </Badge>
        </div>
      </div>

      {usersLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading users...
          </CardContent>
        </Card>
      ) : !filteredUsers.length ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-tea-green to-tea-dark rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-semibold text-lg">
                          {user.firstName} {user.lastName}
                        </h4>
                        {user.isAdmin && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{user.email}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Wallet className="w-3 h-3 mr-1" />
                          ₹{parseFloat(user.walletBalance || "0").toFixed(2)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {user.id !== currentUser?.id && (
                      <Button
                        variant={user.isAdmin ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleAdmin(user)}
                        disabled={toggleAdminMutation.isPending}
                        className="flex items-center space-x-1"
                      >
                        {user.isAdmin ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            <span>Revoke Admin</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Grant Admin</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedUserDetails(user)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(usersData as any)?.total && (usersData as any).total > usersLimit && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
            disabled={usersPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600 px-4">
            Page {usersPage} of {Math.ceil((usersData as any).total / usersLimit)}
          </span>
          
          <Button 
            variant="outline"
            size="sm" 
            onClick={() => setUsersPage(p => p + 1)}
            disabled={usersPage >= Math.ceil((usersData as any).total / usersLimit)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">User Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserDetails(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-sm text-gray-900">{selectedUserDetails.firstName} {selectedUserDetails.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-sm text-gray-900">{selectedUserDetails.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">User ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedUserDetails.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Status</label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedUserDetails.isAdmin ? "default" : "secondary"}>
                        {selectedUserDetails.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Account Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Wallet Balance</label>
                    <p className="text-sm text-gray-900 font-medium">₹{parseFloat(selectedUserDetails.walletBalance || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Created</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedUserDetails.createdAt), 'MMMM dd, yyyy h:mm a')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedUserDetails.updatedAt), 'MMMM dd, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Profile Picture</div>
                  {selectedUserDetails.profilePicture ? (
                    <img 
                      src={selectedUserDetails.profilePicture} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full mt-2"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-tea-green to-tea-dark rounded-full flex items-center justify-center mt-2">
                      <span className="text-white font-medium text-lg">
                        {(selectedUserDetails.firstName?.[0] || '') + (selectedUserDetails.lastName?.[0] || '')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Account Age</div>
                  <div className="text-lg font-semibold text-green-800 mt-1">
                    {Math.floor((new Date().getTime() - new Date(selectedUserDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">User Type</div>
                  <div className="text-lg font-semibold text-purple-800 mt-1">
                    {selectedUserDetails.isAdmin ? "Administrator" : "Regular User"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RfidManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [companyInitials, setCompanyInitials] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const [suggestedCardNumber, setSuggestedCardNumber] = useState("");
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: rfidCards, refetch: refetchCards } = useQuery({
    queryKey: ["/api/admin/rfid/cards"],
  });

  const { data: suggestion } = useQuery({
    queryKey: ["/api/admin/rfid/suggest-card-number", selectedUser, companyInitials, userInitials],
    queryFn: async () => {
      if (!selectedUser || !companyInitials || !userInitials) return null;
      const params = new URLSearchParams({
        userId: selectedUser,
        companyInitials: companyInitials,
        userInitials: userInitials
      });
      const response = await fetch(`/api/admin/rfid/suggest-card-number?${params}`);
      if (!response.ok) throw new Error('Failed to get suggestion');
      return response.json();
    },
    enabled: !!(selectedUser && companyInitials && userInitials),
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: { userId: string; cardNumber: string }) => {
      const response = await fetch('/api/admin/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create card');
      return response.json();
    },
    onSuccess: () => {
      refetchCards();
      setShowCreateForm(false);
      setSelectedUser("");
      setCompanyInitials("");
      setUserInitials("");
      setSuggestedCardNumber("");
      toast({
        title: "Success",
        description: "RFID card created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFID card",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (suggestion?.suggestedCardNumber) {
      setSuggestedCardNumber(suggestion.suggestedCardNumber);
    }
  }, [suggestion]);

  const handleCreateCard = () => {
    if (!selectedUser || !suggestedCardNumber) return;
    
    createCardMutation.mutate({
      userId: selectedUser,
      cardNumber: suggestedCardNumber,
    });
  };

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await fetch(`/api/admin/rfid/cards/${cardId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete card');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "RFID card deleted successfully" });
      refetchCards();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete RFID card",
        variant: "destructive" 
      });
    },
  });

  const handleDeleteCard = (cardId: number) => {
    if (confirm("Are you sure you want to delete this RFID card? This action cannot be undone.")) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const selectedUserData = users?.find((u: any) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">RFID Card Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage RFID cards for users
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Card
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New RFID Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Select User</label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Choose a user...</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Company Initials (2 letters)</label>
                <input
                  type="text"
                  value={companyInitials}
                  onChange={(e) => setCompanyInitials(e.target.value.slice(0, 2).toUpperCase())}
                  placeholder="e.g., UK"
                  className="w-full p-2 border rounded-md"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">User Initials (2 letters)</label>
                <input
                  type="text"
                  value={userInitials}
                  onChange={(e) => setUserInitials(e.target.value.slice(0, 2).toUpperCase())}
                  placeholder="e.g., TP"
                  className="w-full p-2 border rounded-md"
                  maxLength={2}
                />
                {selectedUserData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggestion: {selectedUserData.firstName?.[0]}{selectedUserData.lastName?.[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Generated Card Number</label>
                <input
                  type="text"
                  value={suggestedCardNumber}
                  onChange={(e) => setSuggestedCardNumber(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Will be generated automatically"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateCard}
                disabled={!selectedUser || !suggestedCardNumber || createCardMutation.isPending}
              >
                {createCardMutation.isPending ? "Creating..." : "Create Card"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All RFID Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rfidCards?.map((card: any) => (
              <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="font-medium">{card.cardNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {card.user?.firstName} {card.user?.lastName} ({card.user?.email})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                      {card.lastUsed && (
                        <span> • Last used: {new Date(card.lastUsed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={card.isActive ? "default" : "secondary"}>
                    {card.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    disabled={deleteCardMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {(!rfidCards || rfidCards.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No RFID cards found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// System Settings Management Component  
function SystemSettingsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxWalletBalance, setMaxWalletBalance] = useState('5000.00');
  const [isLoading, setIsLoading] = useState(false);

  const { data: systemSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  useEffect(() => {
    if (systemSettings) {
      const maxBalance = systemSettings.find((s: any) => s.key === 'max_wallet_balance');
      if (maxBalance) {
        setMaxWalletBalance(maxBalance.value);
      }
    }
  }, [systemSettings]);

  const updateSetting = async (key: string, value: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update setting');

      // Invalidate all relevant queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      await refetchSettings();

      toast({
        title: "Success",
        description: "Setting updated successfully. Changes are now active for all payment validations.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxWalletUpdate = () => {
    const value = parseFloat(maxWalletBalance);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }
    updateSetting('max_wallet_balance', value.toFixed(2));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wallet Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure wallet limits and restrictions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxWallet">Maximum Wallet Balance (₹)</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="maxWallet"
                  type="number"
                  value={maxWalletBalance}
                  onChange={(e) => setMaxWalletBalance(e.target.value)}
                  placeholder="5000.00"
                  step="0.01"
                  min="0"
                />
                <Button 
                  onClick={handleMaxWalletUpdate}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Updating..." : "Update Limit"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Users cannot recharge beyond this amount. Changes take effect immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemSettings?.map((setting: any) => (
              <div key={setting.key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{setting.key.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">{setting.description}</div>
                </div>
                <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  {setting.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
