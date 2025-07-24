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

// Component to show user assigned to a business unit (only one allowed)
function UserAssignments({ unitId, onChangeUser }: { unitId: string; onChangeUser: (unitId: string, currentUserId?: string) => void }) {
  const { data: assignments } = useQuery({
    queryKey: [`/api/admin/business-units/${unitId}/users`],
    retry: false,
  });

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return <p className="text-sm text-gray-500 italic">No user assigned</p>;
  }

  const assignment = assignments[0]; // Only one user per business unit

  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <span className="font-medium">{assignment.user?.firstName} {assignment.user?.lastName}</span>
        <div className="text-xs text-gray-500">{assignment.user?.email}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{assignment.role}</Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChangeUser(unitId, assignment.userId)}
          className="text-xs h-6 px-2"
        >
          Change
        </Button>
      </div>
    </div>
  );
}

interface BusinessUnitWithDetails extends BusinessUnit {
  userCount?: number;
  machineCount?: number;
}

export function BusinessUnitsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedAssignmentUnit, setSelectedAssignmentUnit] = useState<string>("");
  const [assignmentSearch, setAssignmentSearch] = useState<string>("");
  const [changingUser, setChangingUser] = useState<{ unitId: string; currentUserId?: string } | null>(null);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/business-units/${variables.unitId}/users`] });
      setSelectedAssignmentUnit(""); // Reset form after successful assignment
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

  const handleChangeUser = (unitId: string, currentUserId?: string) => {
    setChangingUser({ unitId, currentUserId });
    setSelectedAssignmentUnit(unitId);
  };

  const handleConfirmUserChange = (newUserId: string) => {
    if (!changingUser) return;
    
    // If there's a current user, we're changing; otherwise, we're assigning for the first time
    assignUserMutation.mutate({ 
      unitId: changingUser.unitId, 
      userId: newUserId, 
      role: "manager" 
    });
    setChangingUser(null);
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
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">New User Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        1. Select Business Unit:
                      </label>
                      <select
                        value={selectedAssignmentUnit}
                        onChange={(e) => {
                          setSelectedAssignmentUnit(e.target.value);
                          setChangingUser(null); // Reset change mode when selecting different unit
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent"
                      >
                        <option value="">Choose Business Unit...</option>
                        {businessUnits && Array.isArray(businessUnits) && businessUnits.map((unit: BusinessUnit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        2. {changingUser ? "Select New User:" : "Select User to Assign:"}
                      </label>
                      <select
                        disabled={!selectedAssignmentUnit || assignUserMutation.isPending}
                        onChange={(e) => {
                          if (e.target.value && selectedAssignmentUnit) {
                            if (changingUser) {
                              handleConfirmUserChange(e.target.value);
                            } else {
                              handleAssignUser(selectedAssignmentUnit, e.target.value);
                            }
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {selectedAssignmentUnit 
                            ? (changingUser ? "Choose New User..." : "Choose User...") 
                            : "Select Business Unit First"}
                        </option>
                        {selectedAssignmentUnit && allUsers && Array.isArray(allUsers) && allUsers
                          .filter((user: User) => !changingUser || user.id !== changingUser.currentUserId) // Don't show current user in change mode
                          .map((user: User) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  
                  {changingUser && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Change Mode:</strong> Select a new user to replace the current assignment for this business unit.
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setChangingUser(null);
                            setSelectedAssignmentUnit("");
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          Cancel
                        </Button>
                      </p>
                    </div>
                  )}
                  
                  {assignUserMutation.isPending && (
                    <div className="text-center text-sm text-gray-600">
                      Assigning user...
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Current Assignments</h3>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search business units..."
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        className="w-64"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {businessUnits && Array.isArray(businessUnits) 
                      ? businessUnits
                          .filter((unit: BusinessUnit) => 
                            !assignmentSearch || 
                            unit.name.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
                            unit.code.toLowerCase().includes(assignmentSearch.toLowerCase())
                          )
                          .map((unit: BusinessUnit) => (
                            <Card key={unit.id} className="border-l-4 border-l-tea-green">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium">{unit.name}</h4>
                                  <Badge variant="outline">{unit.code}</Badge>
                                </div>
                                <div className="space-y-2">
                                  <UserAssignments unitId={unit.id} onChangeUser={handleChangeUser} />
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      : (
                        <p className="text-gray-600 col-span-full">No business units available</p>
                      )
                    }
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