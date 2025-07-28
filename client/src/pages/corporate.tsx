import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { 
  Coffee, 
  CreditCard, 
  MapPin, 
  Plus, 
  Power, 
  PowerOff, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  Activity,
  TestTube,
  Building2,
  Wallet,
  Download,
  FileText,
  Receipt
} from "lucide-react";
import { format } from "date-fns";

interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  description?: string;
  walletBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RfidCard {
  id: number;
  businessUnitId: string;
  cardNumber: string;
  cardName?: string;
  isActive: boolean;
  lastUsed?: string;
  lastUsedMachineId?: string;
  createdAt: string;
}

interface TeaMachine {
  id: string;
  businessUnitId: string;
  name: string;
  location: string;
  isActive: boolean;
  lastPing?: string;
  teaTypes?: any;
  serialNumber?: string;
  installationDate?: string;
  maintenanceContact?: string;
  createdAt: string;
}

interface DispensingLog {
  id: number;
  businessUnitId: string;
  rfidCardId: number;
  machineId: string;
  teaType: string;
  amount: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

function BusinessUnitTabs({ businessUnits, selectedBusinessUnitId, onSelectBusinessUnit }: {
  businessUnits: BusinessUnit[];
  selectedBusinessUnitId: string | null;
  onSelectBusinessUnit: (id: string) => void;
}) {
  if (businessUnits.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No business units assigned to you.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {businessUnits.map((unit) => (
        <Card 
          key={unit.id} 
          className={`cursor-pointer transition-all ${
            selectedBusinessUnitId === unit.id 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-md'
          }`}
          onClick={() => onSelectBusinessUnit(unit.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {unit.name}
              </CardTitle>
              <Badge variant={unit.isActive ? "default" : "secondary"}>
                {unit.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardDescription>Code: {unit.code}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  ₹{parseFloat(unit.walletBalance).toFixed(2)}
                </span>
              </div>
              {selectedBusinessUnitId === unit.id && (
                <Badge variant="default" className="text-xs">Selected</Badge>
              )}
            </div>
            {unit.description && (
              <p className="text-sm text-gray-600 mt-2">{unit.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BusinessUnitOverview({ businessUnit, machines, rfidCards, dispensingLogs }: {
  businessUnit: BusinessUnit;
  machines: TeaMachine[];
  rfidCards: RfidCard[];
  dispensingLogs: DispensingLog[];
}) {
  const activeMachines = machines.filter(m => m.isActive);
  const activeCards = rfidCards.filter(c => c.isActive);
  const todayLogs = dispensingLogs.filter(log => {
    const logDate = new Date(log.createdAt);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
          <Coffee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMachines.length}</div>
          <p className="text-xs text-muted-foreground">
            {machines.length - activeMachines.length} offline, {machines.length} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Employee Cards</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeCards.length}</div>
          <p className="text-xs text-muted-foreground">
            of {rfidCards.length} total cards
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayLogs.length}</div>
          <p className="text-xs text-muted-foreground">
            employee tea servings dispensed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CorporateDashboard() {
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const logsItemsPerPage = 20; // Fixed at 20 per page for performance
  
  // Date filtering state
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check for pseudo login parameter
  const urlParams = new URLSearchParams(window.location.search);
  const pseudoParam = urlParams.get('pseudo') ? `?pseudo=${urlParams.get('pseudo')}` : '';

  // Get user's business units
  const { data: businessUnits = [], isLoading: businessUnitsLoading } = useQuery({
    queryKey: [`/api/corporate/business-units${pseudoParam}`],
    retry: false,
  });

  // Auto-select first business unit if none selected
  if (businessUnits.length > 0 && !selectedBusinessUnitId) {
    setSelectedBusinessUnitId(businessUnits[0].id);
  }

  // Helper function to get date range based on filter type
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        weekEnd.setHours(23, 59, 59, 999);
        return { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() };
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() };
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return null;
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      }
      default:
        return null; // 'all' - no date filtering
    }
  };

  // Reset page when date filter changes
  useEffect(() => {
    setLogsCurrentPage(1);
  }, [dateFilter, customStartDate, customEndDate]);
  
  // Reset pagination when business unit changes
  useEffect(() => {
    setLogsCurrentPage(1);
    // Invalidate the dispensing logs cache when business unit changes
    queryClient.invalidateQueries({ queryKey: [`/api/corporate/dispensing-logs`] });
  }, [selectedBusinessUnitId, queryClient]);

  const selectedBusinessUnit = businessUnits.find(bu => bu.id === selectedBusinessUnitId);

  // Get data for selected business unit
  const { data: machines = [] } = useQuery({
    queryKey: [`/api/corporate/machines`, selectedBusinessUnitId, pseudoParam],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedBusinessUnitId) params.set('businessUnitId', selectedBusinessUnitId);
      if (pseudoParam) params.set('pseudo', pseudoParam.replace('?pseudo=', ''));
      return fetch(`/api/corporate/machines?${params.toString()}`, { credentials: 'include' }).then(res => res.json());
    },
    enabled: !!selectedBusinessUnitId,
    retry: false,
  });

  const { data: rfidCards = [] } = useQuery({
    queryKey: [`/api/corporate/rfid-cards`, selectedBusinessUnitId, pseudoParam],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedBusinessUnitId) params.set('businessUnitId', selectedBusinessUnitId);
      if (pseudoParam) params.set('pseudo', pseudoParam.replace('?pseudo=', ''));
      return fetch(`/api/corporate/rfid-cards?${params.toString()}`, { credentials: 'include' }).then(res => res.json());
    },
    enabled: !!selectedBusinessUnitId,
    retry: false,
  });

  const { data: dispensingData, isLoading: dispensingLoading } = useQuery({
    queryKey: [`/api/corporate/dispensing-logs-paginated`, selectedBusinessUnitId, logsCurrentPage, logsItemsPerPage, dateFilter, customStartDate, customEndDate, pseudoParam],
    queryFn: async () => {
      if (!selectedBusinessUnitId) return { logs: [], total: 0 };
      
      const params = new URLSearchParams();
      params.set('businessUnitId', selectedBusinessUnitId);
      if (pseudoParam) params.set('pseudo', pseudoParam.replace('?pseudo=', ''));
      params.set('page', logsCurrentPage.toString());
      params.set('limit', logsItemsPerPage.toString());
      params.set('paginated', 'true');
      
      // Add date filtering parameters
      const dateRange = getDateRange();
      if (dateRange) {
        params.set('startDate', dateRange.startDate);
        params.set('endDate', dateRange.endDate);
      }
      
      console.log('Frontend: Building request with params:', {
        businessUnitId: selectedBusinessUnitId,
        page: logsCurrentPage,
        limit: logsItemsPerPage,
        paginated: 'true',
        dateFilter,
        dateRange
      });
      
      const response = await fetch(`/api/corporate/dispensing-logs?${params.toString()}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!selectedBusinessUnitId,
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  // Handle both paginated and non-paginated response formats
  const dispensingLogs = Array.isArray(dispensingData) ? dispensingData : (dispensingData?.logs || []);
  const totalLogsCount = Array.isArray(dispensingData) ? dispensingData.length : (dispensingData?.total || 0);
  const totalLogsPages = Math.ceil(totalLogsCount / logsItemsPerPage);

  // Get user info for the testing banner
  const userId = urlParams.get('pseudo');
  const { data: testUser } = useQuery({
    queryKey: [`/api/admin/user/${userId}`],
    enabled: !!userId,
    retry: false,
  });

  // Create RFID card mutation
  const createCardMutation = useMutation({
    mutationFn: async (cardData: { cardNumber: string; cardName: string; businessUnitId: string }) => {
      return apiRequest("POST", `/api/corporate/rfid-cards${pseudoParam}`, cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/corporate/rfid-cards`, selectedBusinessUnitId, pseudoParam] });
      setNewCardName("");
      setNewCardNumber("");
      setIsCardDialogOpen(false);
      toast({ title: "Success", description: "RFID card created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFID card",
        variant: "destructive",
      });
    },
  });

  // Deactivate card mutation
  const deactivateCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      return apiRequest("DELETE", `/api/corporate/rfid-cards/${cardId}${pseudoParam}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/corporate/rfid-cards`, selectedBusinessUnitId, pseudoParam] });
      toast({ title: "Success", description: "RFID card deactivated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate RFID card",
        variant: "destructive",
      });
    },
  });

  const handleCreateCard = () => {
    if (!selectedBusinessUnitId) {
      toast({
        title: "Error",
        description: "Please select a business unit first",
        variant: "destructive",
      });
      return;
    }

    createCardMutation.mutate({
      cardNumber: newCardNumber,
      cardName: newCardName,
      businessUnitId: selectedBusinessUnitId,
    });
  };

  const getMachineStatus = (machine: TeaMachine) => {
    if (!machine.isActive) return "Disabled";
    if (!machine.lastPing) return "Offline";
    
    const lastPing = new Date(machine.lastPing);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastPing.getTime()) / (1000 * 60);
    
    return diffMinutes <= 30 ? "Online" : "Offline";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online": return "bg-green-500";
      case "Offline": return "bg-yellow-500";
      case "Disabled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (businessUnitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-4">
          <div className="text-center py-8">Loading business units...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto p-4">
        {/* Testing Banner */}
        {testUser && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg flex items-center gap-2">
            <TestTube className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Testing Mode: {testUser.firstName} {testUser.lastName}
            </span>
            <p className="text-blue-700 text-sm">
              You are viewing the dashboard as this user. Data shown is specific to their business unit assignments.
            </p>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Unit Management</h1>
          <p className="text-gray-600">
            Manage your tea machines, employee RFID cards, and business operations
          </p>
        </div>

        {/* Business Unit Selection */}
        <BusinessUnitTabs
          businessUnits={businessUnits}
          selectedBusinessUnitId={selectedBusinessUnitId}
          onSelectBusinessUnit={setSelectedBusinessUnitId}
        />

        {/* Business Unit Content */}
        {selectedBusinessUnit ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedBusinessUnit.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Code: {selectedBusinessUnit.code}</span>
                <span className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  Wallet Balance: ₹{parseFloat(selectedBusinessUnit.walletBalance).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Overview */}
            <BusinessUnitOverview
              businessUnit={selectedBusinessUnit}
              machines={machines}
              rfidCards={rfidCards}
              dispensingLogs={dispensingLogs}
            />

            {/* Tabs for detailed view */}
            <Tabs defaultValue="machines" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="machines">Machines</TabsTrigger>
                <TabsTrigger value="cards">Employee Cards</TabsTrigger>
                <TabsTrigger value="logs">Usage Logs</TabsTrigger>
                <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="machines" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coffee className="h-5 w-5" />
                      Tea Machines ({machines.length})
                    </CardTitle>
                    <CardDescription>
                      Machines assigned to {selectedBusinessUnit.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {machines.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No machines assigned to this business unit.</p>
                    ) : (
                      <div className="space-y-4">
                        {machines.map((machine) => {
                          const status = getMachineStatus(machine);
                          return (
                            <div key={machine.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                                <div>
                                  <h3 className="font-medium">{machine.name}</h3>
                                  <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {machine.location}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={status === "Online" ? "default" : status === "Offline" ? "secondary" : "destructive"}>
                                  {status}
                                </Badge>
                                {machine.lastPing && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Last ping: {format(new Date(machine.lastPing), "MMM d, HH:mm")}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cards" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Employee RFID Cards ({rfidCards.length})
                        </CardTitle>
                        <CardDescription>
                          RFID cards for {selectedBusinessUnit.name} employees
                        </CardDescription>
                      </div>
                      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Card
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New RFID Card</DialogTitle>
                            <DialogDescription>
                              Add a new RFID card for {selectedBusinessUnit.name} employees
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="cardNumber">Card Number</Label>
                              <Input
                                id="cardNumber"
                                value={newCardNumber}
                                onChange={(e) => setNewCardNumber(e.target.value)}
                                placeholder="Enter card number"
                              />
                            </div>
                            <div>
                              <Label htmlFor="cardName">Card Name/Description</Label>
                              <Input
                                id="cardName"
                                value={newCardName}
                                onChange={(e) => setNewCardName(e.target.value)}
                                placeholder="e.g., Employee Card 1"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleCreateCard}
                              disabled={!newCardNumber || !newCardName || createCardMutation.isPending}
                            >
                              {createCardMutation.isPending ? "Creating..." : "Create Card"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {rfidCards.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No RFID cards created for this business unit.</p>
                    ) : (
                      <div className="space-y-4">
                        {rfidCards.map((card) => (
                          <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <CreditCard className={`h-5 w-5 ${card.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                              <div>
                                <h3 className="font-medium">{card.cardName || `Card ${card.id}`}</h3>
                                <p className="text-sm text-gray-500">Number: {card.cardNumber}</p>
                                {card.lastUsed && (
                                  <p className="text-xs text-gray-400">
                                    Last used: {format(new Date(card.lastUsed), "MMM d, HH:mm")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={card.isActive ? "default" : "secondary"}>
                                {card.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {card.isActive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deactivateCardMutation.mutate(card.id)}
                                  disabled={deactivateCardMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Employee Usage Logs ({totalLogsCount} total entries)
                    </CardTitle>
                    <CardDescription>
                      Recent tea dispensing activity for {selectedBusinessUnit.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispensingLoading ? (
                      <div className="text-center py-4">Loading usage logs...</div>
                    ) : totalLogsCount === 0 ? (
                      <p className="text-center text-gray-500 py-4">No usage logs for this business unit yet.</p>
                    ) : (
                      <>
                        {/* Date Filter Controls */}
                        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-600" />
                              <Label className="text-sm font-medium">Filter by date:</Label>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setDateFilter('all')}
                                className={`px-3 py-1 rounded text-sm ${
                                  dateFilter === 'all' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border hover:bg-gray-50'
                                }`}
                              >
                                All Time
                              </button>
                              <button
                                onClick={() => setDateFilter('week')}
                                className={`px-3 py-1 rounded text-sm ${
                                  dateFilter === 'week' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border hover:bg-gray-50'
                                }`}
                              >
                                This Week
                              </button>
                              <button
                                onClick={() => setDateFilter('month')}
                                className={`px-3 py-1 rounded text-sm ${
                                  dateFilter === 'month' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border hover:bg-gray-50'
                                }`}
                              >
                                This Month
                              </button>
                              <button
                                onClick={() => setDateFilter('custom')}
                                className={`px-3 py-1 rounded text-sm ${
                                  dateFilter === 'custom' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border hover:bg-gray-50'
                                }`}
                              >
                                Custom Range
                              </button>
                            </div>
                          </div>
                          
                          {/* Custom Date Range Inputs */}
                          {dateFilter === 'custom' && (
                            <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              <Label className="text-sm">From:</Label>
                              <Input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-auto"
                              />
                              <Label className="text-sm">To:</Label>
                              <Input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-auto"
                              />
                            </div>
                          )}
                        </div>

                        {/* Pagination Controls at Top */}
                        {totalLogsPages > 1 && (
                          <div className="flex items-center justify-between mb-4 pb-4 border-b">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">20 items per page</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setLogsCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={logsCurrentPage === 1}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              
                              <span className="text-sm text-gray-600">
                                Page {logsCurrentPage} of {totalLogsPages}
                              </span>
                              
                              <button
                                onClick={() => setLogsCurrentPage(prev => Math.min(totalLogsPages, prev + 1))}
                                disabled={logsCurrentPage === totalLogsPages}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4 mb-4">
                          {dispensingLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                  <h3 className="font-medium">
                                    {log.teaType} - ₹{log.amount}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    Card ID: {log.rfidCardId} • Machine: {log.machineId}
                                  </p>
                                  {log.errorMessage && (
                                    <p className="text-xs text-red-500">{log.errorMessage}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={log.success ? "default" : "destructive"}>
                                  {log.success ? "Success" : "Failed"}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(new Date(log.createdAt), "MMM d, HH:mm")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Pagination controls moved to top */}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <MonthlyReportsTab businessUnitId={selectedBusinessUnitId!} businessUnitName={selectedBusinessUnit.name} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Select a business unit to view its details.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MonthlyReportsTab({ businessUnitId, businessUnitName }: { businessUnitId: string; businessUnitName: string }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [showExportConfirmation, setShowExportConfirmation] = useState(false);
  const { toast } = useToast();

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

  // Get monthly transaction summary
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: [`/api/corporate/monthly-summary/${businessUnitId}/${selectedMonth}`],
    enabled: !!businessUnitId && !!selectedMonth,
    retry: false,
  });

  const handleExportCSV = async () => {
    setIsExporting(true);
    setShowExportConfirmation(false);
    try {
      console.log('Frontend: Starting CSV export for:', { businessUnitId, selectedMonth, businessUnitName });
      
      const response = await fetch(`/api/corporate/monthly-export/${businessUnitId}/${selectedMonth}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log('Frontend: Export response status:', response.status);
      console.log('Frontend: Export response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${businessUnitName}-transactions-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Transaction data exported for ${selectedMonth}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export transaction data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportConfirmation = () => {
    setShowExportConfirmation(true);
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const response = await fetch(`/api/corporate/monthly-invoice/${businessUnitId}/${selectedMonth}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Invoice generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${businessUnitName}-invoice-${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Invoice Generated",
        description: `Invoice created for ${selectedMonth}`,
      });
    } catch (error) {
      toast({
        title: "Invoice Generation Failed",
        description: "Unable to generate invoice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Monthly Reports & Invoicing
        </CardTitle>
        <CardDescription>
          Export transaction data and generate invoices for {businessUnitName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selection */}
        <div>
          <Label htmlFor="month-select">Select Month</Label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Monthly Summary */}
        {monthlyLoading ? (
          <div className="text-center py-4">Loading monthly summary...</div>
        ) : monthlyData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {(monthlyData as any)?.totalTransactions || 0}
                </div>
                <p className="text-sm text-gray-600">Total Transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  ₹{parseFloat((monthlyData as any)?.totalAmount || 0).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">Total Amount</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {(monthlyData as any)?.uniqueMachines || 0}
                </div>
                <p className="text-sm text-gray-600">Machines Used</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {(monthlyData as any)?.uniqueCards || 0}
                </div>
                <p className="text-sm text-gray-600">Employee Cards</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No transaction data available for the selected month
          </div>
        )}

        {/* Export Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleExportConfirmation}
            disabled={isExporting || !monthlyData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGeneratingInvoice || !monthlyData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {isGeneratingInvoice ? "Generating..." : "Generate Invoice PDF"}
          </Button>
        </div>

        {/* Export Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Export Information</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>CSV Export:</strong> Contains all transaction details, timestamps, machine IDs, and amounts</li>
            <li>• <strong>Invoice PDF:</strong> Professional invoice with company branding and transaction summary</li>
            <li>• <strong>Data Scope:</strong> All dispensing transactions charged to {businessUnitName} wallet</li>
            <li>• <strong>File Naming:</strong> Files include business unit name and month for easy organization</li>
          </ul>
        </div>

        {/* Export Confirmation Modal */}
        {showExportConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Confirm CSV Export</h3>
                </div>
                <p className="text-gray-600 mb-4">Please review the export summary before proceeding</p>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Business Unit:</span>
                      <span className="text-gray-900">{businessUnitName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Month:</span>
                      <span className="text-gray-900">
                        {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    {monthlyData && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">Transactions:</span>
                          <span className="text-gray-900">{(monthlyData as any)?.totalTransactions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">Total Amount:</span>
                          <span className="text-gray-900">₹{parseFloat((monthlyData as any)?.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">Machines Used:</span>
                          <span className="text-gray-900">{(monthlyData as any)?.uniqueMachines || 0}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This will download a CSV file containing all transaction records for the selected month. 
                      Avoid creating multiple exports to prevent unnecessary file duplicates.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExportConfirmation(false)}
                    disabled={isExporting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className="flex items-center gap-2 flex-1"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Confirm Export</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}