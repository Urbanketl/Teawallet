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
  Plus,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    teaPrice: "5.00",
    maintenanceMode: false,
    autoRecharge: true,
    maxWalletBalance: "1000.00",
    lowBalanceThreshold: "50.00",
    systemName: "UrbanKetl Tea System"
  });

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

  const queryClient = useQueryClient();

  // State declarations first
  const [statusUpdateDialogs, setStatusUpdateDialogs] = useState<{ [key: number]: boolean }>({});
  const [statusUpdateData, setStatusUpdateData] = useState<{ [key: number]: { status: string; comment: string } }>({});
  const [historyDialogs, setHistoryDialogs] = useState<{ [key: number]: boolean }>({});
  const [ticketHistories, setTicketHistories] = useState<{ [key: number]: any[] }>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const { data: supportTickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["/api/admin/support/tickets"],
    enabled: isAuthenticated && user?.isAdmin,
    retry: false,
    refetchInterval: 5000,
  });

  // Debug logging
  console.log('Support tickets data:', supportTickets);
  console.log('Support tickets loading:', ticketsLoading);
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
                      onClick={() => {
                        toast({
                          title: "Settings Updated",
                          description: "System settings have been saved successfully.",
                        });
                        setSettingsOpen(false);
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

        {/* Tabs Interface */}
        <Tabs defaultValue="overview" className="space-y-6 mt-12">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rfid">RFID Cards</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="support">Support Tickets</TabsTrigger>
            <TabsTrigger value="faq">FAQ Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview Dashboard</h3>
              <p className="text-gray-600">System statistics and insights displayed above</p>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">User data displayed in the cards above</p>
            </div>
          </TabsContent>

          <TabsContent value="rfid">
            <RfidManagement />
          </TabsContent>

          <TabsContent value="machines">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Management</h3>
              <p className="text-gray-600">Machine status displayed in the cards above</p>
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
              <div className="flex items-center space-x-4">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                  {filterTicketsByDate(supportTickets || []).length} / {(supportTickets || []).length} Tickets
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
              {ticketsLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    Loading support tickets...
                  </CardContent>
                </Card>
              ) : filterTicketsByDate(supportTickets || []).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No support tickets found for the selected date range</p>
                  </CardContent>
                </Card>
              ) : (
                filterTicketsByDate(supportTickets || []).map((ticket: any) => (
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
                        <Select
                          value={ticket.status}
                          onValueChange={(status) => {
                            console.log("Status change triggered:", ticket.id, "->", status);
                            handleStatusChange(ticket.id, status);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>

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
                  ))
                )}
              </div>
            </TabsContent>
          <TabsContent value="faq">
            <FaqManagement />
          </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

function FaqManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqData, setFaqData] = useState({ question: '', answer: '', category: 'general' });
  const { toast } = useToast();

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
