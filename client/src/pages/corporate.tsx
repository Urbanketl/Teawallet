import { useState } from "react";
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
  Activity
} from "lucide-react";
import { format } from "date-fns";

interface RfidCard {
  id: number;
  businessUnitAdminId: string;
  cardNumber: string;
  cardName?: string;
  isActive: boolean;
  lastUsed?: string;
  lastUsedMachineId?: string;
  createdAt: string;
}

interface TeaMachine {
  id: string;
  businessUnitAdminId: string;
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
  businessUnitAdminId: string;
  rfidCardId: number;
  machineId: string;
  teaType: string;
  amount: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export default function CorporateDashboard() {
  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Machine status helper functions (same as admin page)
  const isRecentlyPinged = (lastPing: string | null) => {
    if (!lastPing) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastPing) > fiveMinutesAgo;
  };

  const getMachineStatus = (machine: TeaMachine) => {
    if (!machine.isActive) return "Disabled";
    if (isRecentlyPinged(machine.lastPing)) return "Online";
    return "Offline";
  };

  const getMachineStatusVariant = (machine: TeaMachine) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "default";
    if (status === "Offline") return "secondary";
    return "destructive"; // Disabled
  };

  const getMachineStatusIndicator = (machine: TeaMachine) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "bg-green-400";
    if (status === "Offline") return "bg-yellow-400";
    return "bg-red-400"; // Disabled
  };

  const getTimeSinceLastPing = (lastPing: string | null) => {
    if (!lastPing) return "Never pinged";
    const now = new Date();
    const ping = new Date(lastPing);
    const diffInMinutes = Math.floor((now.getTime() - ping.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Fetch managed RFID cards
  const { data: rfidCards = [], isLoading: cardsLoading } = useQuery<RfidCard[]>({
    queryKey: ["/api/corporate/rfid-cards"],
  });

  // Fetch managed machines
  const { data: machines = [], isLoading: machinesLoading } = useQuery<TeaMachine[]>({
    queryKey: ["/api/corporate/machines"],
  });

  // Fetch dispensing logs
  const { data: dispensingLogs = [], isLoading: logsLoading } = useQuery<DispensingLog[]>({
    queryKey: ["/api/corporate/dispensing-logs"],
  });

  // Create RFID card mutation
  const createCardMutation = useMutation({
    mutationFn: (data: { cardNumber: string; cardName?: string }) =>
      apiRequest("/api/corporate/rfid-cards", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/rfid-cards"] });
      toast({ title: "RFID card created successfully" });
      setIsCardDialogOpen(false);
      setNewCardName("");
      setNewCardNumber("");
    },
    onError: () => {
      toast({ title: "Failed to create RFID card", variant: "destructive" });
    },
  });

  // Deactivate card mutation
  const deactivateCardMutation = useMutation({
    mutationFn: (cardId: number) =>
      apiRequest(`/api/corporate/rfid-cards/${cardId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/rfid-cards"] });
      toast({ title: "RFID card deactivated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to deactivate RFID card", variant: "destructive" });
    },
  });

  const handleCreateCard = () => {
    if (!newCardNumber.trim()) {
      toast({ title: "Please enter a card number", variant: "destructive" });
      return;
    }
    createCardMutation.mutate({
      cardNumber: newCardNumber,
      cardName: newCardName || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Unit Management</h1>
          <p className="text-gray-600 mt-2">Manage your tea machines, employee RFID cards, and business operations</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="cards">Employee Cards</TabsTrigger>
            <TabsTrigger value="usage">Employee Usage Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{machines.filter(m => getMachineStatus(m) === "Online").length}</div>
                  <p className="text-xs text-muted-foreground">
                    {machines.filter(m => getMachineStatus(m) === "Offline").length} offline, {machines.filter(m => getMachineStatus(m) === "Disabled").length} disabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Employee Cards</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rfidCards.filter(c => c.isActive).length}</div>
                  <p className="text-xs text-muted-foreground">
                    of {rfidCards.length} total cards
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Employee Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dispensingLogs.length}</div>
                  <p className="text-xs text-muted-foreground">
                    employee tea servings dispensed
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="machines" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Your Tea Machines</h2>
                <p className="text-sm text-gray-600 mt-1">View the machines assigned to your business unit</p>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                    {machines.length} Total
                  </Badge>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    {machines.filter(m => getMachineStatus(m) === "Online").length} Online
                  </Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    {machines.filter(m => getMachineStatus(m) === "Offline").length} Offline
                  </Badge>
                  <Badge variant="destructive" className="bg-red-100 text-red-700">
                    {machines.filter(m => getMachineStatus(m) === "Disabled").length} Disabled
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machinesLoading ? (
                <div>Loading machines...</div>
              ) : (
                machines.map((machine) => (
                  <Card key={machine.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getMachineStatusIndicator(machine)}`} />
                          <div>
                            <CardTitle className="text-lg">{machine.name}</CardTitle>
                            <CardDescription className="flex items-center mt-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {machine.location}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={getMachineStatusVariant(machine)}>
                          {getMachineStatus(machine)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Last ping:</span>
                          <span>{machine.lastPing ? format(new Date(machine.lastPing), "MMM d, HH:mm") : "Never"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className="text-gray-500">{getTimeSinceLastPing(machine.lastPing)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Tea Price:</span>
                          <span className="font-medium">₹{machine.teaTypes?.[0]?.price || "5.00"}</span>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">RFID Cards</h2>
              <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New RFID Card</DialogTitle>
                    <DialogDescription>
                      Create a new RFID card for your business unit
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="CARD001"
                        value={newCardNumber}
                        onChange={(e) => setNewCardNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardName">Card Name (Optional)</Label>
                      <Input
                        id="cardName"
                        placeholder="Office Card #1"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateCard}
                      disabled={createCardMutation.isPending}
                    >
                      Add Card
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardsLoading ? (
                <div>Loading cards...</div>
              ) : (
                rfidCards.map((card) => (
                  <Card key={card.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{card.cardName || card.cardNumber}</CardTitle>
                          <CardDescription>Card #{card.cardNumber}</CardDescription>
                        </div>
                        <Badge variant={card.isActive ? "default" : "secondary"}>
                          {card.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Last used: {card.lastUsed ? format(new Date(card.lastUsed), "MMM d, HH:mm") : "Never"}
                        </div>
                        {card.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateCardMutation.mutate(card.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <h2 className="text-xl font-semibold">Usage Logs</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Tea Dispensing Activity</CardTitle>
                <CardDescription>
                  Monitor tea usage across your machines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div>Loading usage logs...</div>
                ) : dispensingLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No dispensing activity yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dispensingLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge variant={log.success ? "default" : "destructive"}>
                            {log.success ? "Success" : "Failed"}
                          </Badge>
                          <div>
                            <div className="font-medium">{log.teaType}</div>
                            <div className="text-sm text-gray-600">
                              Machine: {log.machineId} • Card: {log.rfidCardId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{log.amount}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(log.createdAt), "MMM d, HH:mm")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}