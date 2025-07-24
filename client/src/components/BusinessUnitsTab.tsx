import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Settings, Plus, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BusinessUnit, User, TeaMachine } from "@shared/schema";

interface BusinessUnitWithDetails extends BusinessUnit {
  userCount?: number;
  machineCount?: number;
}

export function BusinessUnitsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [newUnitForm, setNewUnitForm] = useState({
    name: "",
    code: "",
    description: "",
    walletBalance: "0.00"
  });

  // Fetch business units
  const { data: businessUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units"],
    retry: false,
  });

  // Fetch all users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Fetch unassigned machines
  const { data: unassignedMachines } = useQuery({
    queryKey: ["/api/admin/machines/unassigned"],
    retry: false,
  });

  // Create business unit mutation
  const createUnitMutation = useMutation({
    mutationFn: async (unitData: typeof newUnitForm) => {
      return apiRequest("POST", "/api/admin/business-units", unitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      setNewUnitForm({ name: "", code: "", description: "", walletBalance: "0.00" });
      toast({ title: "Success", description: "Business unit created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create business unit",
        variant: "destructive" 
      });
    }
  });

  // Assign user to business unit mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ unitId, userId, role }: { unitId: string; userId: string; role: string }) => {
      return apiRequest("POST", `/api/admin/business-units/${unitId}/users`, { userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({ title: "Success", description: "User assigned successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to assign user",
        variant: "destructive" 
      });
    }
  });

  // Assign machine to business unit mutation
  const assignMachineMutation = useMutation({
    mutationFn: async ({ unitId, machineId }: { unitId: string; machineId: string }) => {
      return apiRequest("POST", `/api/admin/business-units/${unitId}/machines`, { machineId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines/unassigned"] });
      toast({ title: "Success", description: "Machine assigned successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to assign machine",
        variant: "destructive" 
      });
    }
  });

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitForm.name || !newUnitForm.code) {
      toast({ title: "Error", description: "Name and code are required", variant: "destructive" });
      return;
    }
    createUnitMutation.mutate(newUnitForm);
  };

  const handleAssignUser = (unitId: string, userId: string) => {
    assignUserMutation.mutate({ unitId, userId, role: "manager" });
  };

  const handleAssignMachine = (unitId: string, machineId: string) => {
    assignMachineMutation.mutate({ unitId, machineId });
  };

  if (unitsLoading) {
    return <div className="flex items-center justify-center h-64">Loading business units...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Units Management</h2>
          <p className="text-gray-600">Create and manage business units, assign users and machines</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Unit</TabsTrigger>
          <TabsTrigger value="assign-users">Assign Users</TabsTrigger>
          <TabsTrigger value="assign-machines">Assign Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessUnits && Array.isArray(businessUnits) && businessUnits.length > 0 ? (
              businessUnits.map((unit: BusinessUnit) => (
                <Card key={unit.id} className="shadow-material">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-tea-green" />
                        {unit.name}
                      </CardTitle>
                      <Badge variant={unit.isActive ? "default" : "secondary"}>
                        {unit.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Code:</span>
                        <span className="font-medium">{unit.code}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Wallet Balance:</span>
                        <span className="font-medium text-tea-green">₹{unit.walletBalance}</span>
                      </div>
                    </div>
                    
                    {unit.description && (
                      <p className="text-sm text-gray-600">{unit.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created: {unit.createdAt ? new Date(unit.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Building2 className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Business Units</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Get started by creating your first business unit
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Business Unit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUnit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Business Unit Name *</Label>
                    <Input
                      id="name"
                      value={newUnitForm.name}
                      onChange={(e) => setNewUnitForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Tech Division"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Unit Code *</Label>
                    <Input
                      id="code"
                      value={newUnitForm.code}
                      onChange={(e) => setNewUnitForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., TECH01"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newUnitForm.description}
                    onChange={(e) => setNewUnitForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this business unit..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="walletBalance">Initial Wallet Balance</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="walletBalance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newUnitForm.walletBalance}
                      onChange={(e) => setNewUnitForm(prev => ({ ...prev, walletBalance: e.target.value }))}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-tea-green hover:bg-tea-dark"
                  disabled={createUnitMutation.isPending}
                >
                  {createUnitMutation.isPending ? "Creating..." : "Create Business Unit"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign-users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assign Users to Business Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-4">Available Users</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers && (allUsers as any).users && Array.isArray((allUsers as any).users) ? (allUsers as any).users.map((user: User) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <div className="space-x-2">
                          {businessUnits && Array.isArray(businessUnits) && businessUnits.map((unit: BusinessUnit) => (
                            <Button
                              key={unit.id}
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignUser(unit.id, user.id)}
                              disabled={assignUserMutation.isPending}
                            >
                              → {unit.code}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <p className="text-gray-600">No users available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-4">Business Units</h3>
                  <div className="space-y-4">
                    {businessUnits && businessUnits.map((unit: BusinessUnit) => (
                      <Card key={unit.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{unit.name}</h4>
                            <Badge variant="outline">{unit.code}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Click user assignments on the left to assign to this unit
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign-machines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Assign Machines to Business Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-4">Unassigned Machines</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {unassignedMachines && Array.isArray(unassignedMachines) && unassignedMachines.length > 0 ? (
                      unassignedMachines.map((machine: TeaMachine) => (
                        <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-sm text-gray-600">{machine.location}</div>
                          </div>
                          <div className="space-x-2">
                            {businessUnits && Array.isArray(businessUnits) && businessUnits.map((unit: BusinessUnit) => (
                              <Button
                                key={unit.id}
                                size="sm"
                                variant="outline"
                                onClick={() => handleAssignMachine(unit.id, machine.id)}
                                disabled={assignMachineMutation.isPending}
                              >
                                → {unit.code}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">No unassigned machines available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-4">Business Units</h3>
                  <div className="space-y-4">
                    {businessUnits && Array.isArray(businessUnits) && businessUnits.map((unit: BusinessUnit) => (
                      <Card key={unit.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{unit.name}</h4>
                            <Badge variant="outline">{unit.code}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Click machine assignments on the left to assign to this unit
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}