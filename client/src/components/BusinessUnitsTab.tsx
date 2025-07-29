import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Removed Select import - using native HTML selects for better compatibility
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BusinessUnit } from "@shared/schema";
import { AdminTransferInterface } from "./AdminTransferInterface";

// User Assignment Interface Component
function UserAssignmentInterface({ businessUnits, setActiveTab }: { businessUnits: BusinessUnit[]; setActiveTab: (tab: string) => void; }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("Viewer");

  // Reset form when business unit changes
  const handleBusinessUnitChange = (businessUnitId: string) => {
    setSelectedBusinessUnit(businessUnitId);
    setSelectedUser("");
    setSelectedRole("Viewer"); // Always reset to Viewer when changing business units
  };

  // Fetch all users for assignment
  const { data: allUsersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const allUsers = Array.isArray(allUsersResponse) ? allUsersResponse : (allUsersResponse?.users || []);

  // Debug logging
  console.log("All users data:", allUsers);
  console.log("Users loading:", usersLoading);

  // Fetch current assignments for selected business unit
  const { data: currentAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: [`/api/admin/business-units/${selectedBusinessUnit}/users`],
    enabled: !!selectedBusinessUnit,
    retry: false,
  });

  // Debug logging
  console.log("Current assignments data:", currentAssignments);
  console.log("Selected business unit:", selectedBusinessUnit);
  console.log("Selected role:", selectedRole);
  console.log("Assignments loading:", assignmentsLoading);
  console.log("Has Business Unit Admin:", Array.isArray(currentAssignments) && currentAssignments.some((a: any) => a.role === 'Business Unit Admin'));
  
  // Check if business unit already has a Business Unit Admin
  const hasBusinessUnitAdmin = Array.isArray(currentAssignments) && currentAssignments.some((assignment: any) => 
    assignment.role === 'Business Unit Admin'
  );

  // Assignment mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, businessUnitId, role }: { userId: string; businessUnitId: string; role: string }) => {
      return apiRequest("POST", `/api/admin/business-units/${businessUnitId}/assign-user`, { userId, role });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User assigned successfully!" });
      // Invalidate all related queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/business-units/${selectedBusinessUnit}/users`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      // Force refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ["/api/admin/business-units"] });
      setSelectedUser("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Assignment Failed", 
        description: error.message || "Failed to assign user",
        variant: "destructive" 
      });
    }
  });

  // Unassignment mutation  
  const unassignUserMutation = useMutation({
    mutationFn: async ({ userId, businessUnitId }: { userId: string; businessUnitId: string }) => {
      return apiRequest("POST", `/api/admin/business-units/${businessUnitId}/unassign-user`, { userId });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User unassigned successfully!" });
      // Invalidate all related queries to ensure synchronization  
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/business-units/${selectedBusinessUnit}/users`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      // Force refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ["/api/admin/business-units"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Unassignment Failed", 
        description: error.message || "Failed to unassign user",
        variant: "destructive" 
      });
    }
  });

  const handleAssignUser = () => {
    if (!selectedBusinessUnit || !selectedUser) {
      toast({
        title: "Missing Information",
        description: "Please select both business unit and user",
        variant: "destructive"
      });
      return;
    }

    // Check business rule for Business Unit Admin assignment (only block admin, not viewers)
    if (selectedRole === 'Business Unit Admin' && hasBusinessUnitAdmin) {
      toast({
        title: "Business Unit Admin Already Exists",
        description: "This business unit already has an admin. Use the Business Ownership tab to transfer ownership.",
        variant: "destructive",
      });
      return;
    }

    assignUserMutation.mutate({
      userId: selectedUser,
      businessUnitId: selectedBusinessUnit,
      role: selectedRole
    });
  };

  const handleUnassignUser = (userId: string, userName: string, userRole: string) => {
    if (confirm(`Are you sure you want to remove ${userName} (${userRole}) from this business unit? This action cannot be undone.`)) {
      unassignUserMutation.mutate({
        userId,
        businessUnitId: selectedBusinessUnit
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            User Assignments
          </CardTitle>
          <p className="text-sm text-gray-600">
            Assign users to business units with specific roles: Platform Admin (full access), Business Unit Admin (manage tea programs), or Viewer (read-only reports).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Unit Selection */}
          <div>
            <Label htmlFor="business-unit-select">Select Business Unit</Label>
            <select
              id="business-unit-select"
              value={selectedBusinessUnit}
              onChange={(e) => handleBusinessUnitChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Choose a business unit...</option>
              {businessUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Form */}
          {selectedBusinessUnit && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="user-select">Select User</Label>
                <select
                  id="user-select"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  disabled={usersLoading}
                >
                  <option value="">Choose a user...</option>
                  {Array.isArray(allUsers?.users) 
                    ? allUsers.users.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))
                    : Array.isArray(allUsers) 
                      ? allUsers.map((user: any) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))
                      : null
                  }
                </select>
              </div>

              <div>
                <Label htmlFor="role-select">Role</Label>
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Viewer">Viewer (Read-only reports)</option>
                  {!hasBusinessUnitAdmin && (
                    <option value="Business Unit Admin">Business Unit Admin (Manage tea programs)</option>
                  )}
                </select>
                {selectedRole === 'Business Unit Admin' && hasBusinessUnitAdmin && (
                  <p className="text-sm text-amber-600 mt-1">
                    This business unit already has an admin. Only one Business Unit Admin is allowed per unit.
                  </p>
                )}
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleAssignUser}
                  disabled={
                    !selectedUser || 
                    assignUserMutation.isPending ||
                    (selectedRole === 'Business Unit Admin' && hasBusinessUnitAdmin)
                  }
                  className="w-full bg-tea-green hover:bg-tea-dark disabled:bg-gray-400"
                >
                  {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
                </Button>
              </div>
            </div>
          )}

          {/* Current Assignments */}
          {selectedBusinessUnit && (
            <div>
              <h3 className="font-semibold mb-3">Current Assignments</h3>
              {assignmentsLoading ? (
                <p className="text-gray-500">Loading assignments...</p>
              ) : Array.isArray(currentAssignments) && currentAssignments.length > 0 ? (
                <div className="space-y-2">
                  {Array.isArray(currentAssignments) && currentAssignments.map((assignment: any) => (
                    <div key={assignment.userId} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <span className="font-medium">
                          {assignment.firstName} {assignment.lastName}
                        </span>
                        <span className="text-gray-500 ml-2">({assignment.email})</span>
                        <span className="ml-3 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {assignment.role || 'Viewer'}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleUnassignUser(
                          assignment.userId, 
                          `${assignment.firstName} ${assignment.lastName}`, 
                          assignment.role
                        )}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No users assigned to this business unit.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BusinessUnitWithDetails extends BusinessUnit {
  userCount?: number;
  machineCount?: number;
  machines?: Array<{
    id: string;
    name: string;
    location: string;
    isActive: boolean;
  }>;
}

type SortField = 'name' | 'code' | 'walletBalance' | 'isActive' | 'ownerName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function BusinessUnitsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [newUnitForm, setNewUnitForm] = useState({
    name: "",
    code: "",
    description: ""
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "low" | "medium" | "high">("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Fetch business units
  const { data: businessUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units"],
    retry: false,
  });

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Filter and sort business units
  const filteredAndSortedUnits = useMemo(() => {
    if (!businessUnits || !Array.isArray(businessUnits)) return [];
    
    let filtered = businessUnits.filter((unit: BusinessUnit) => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.ownerName || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "active" && unit.isActive) ||
        (statusFilter === "inactive" && !unit.isActive);
      
      // Balance filter
      const balance = parseFloat(unit.walletBalance || "0");
      const balanceMatch = balanceFilter === "all" ||
        (balanceFilter === "low" && balance < 500) ||
        (balanceFilter === "medium" && balance >= 500 && balance < 2000) ||
        (balanceFilter === "high" && balance >= 2000);
      
      return searchMatch && statusMatch && balanceMatch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle different data types
      if (sortField === 'walletBalance') {
        aValue = parseFloat(a.walletBalance || "0");
        bValue = parseFloat(b.walletBalance || "0");
      } else if (sortField === 'isActive') {
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
      } else if (sortField === 'ownerName') {
        aValue = (a.ownerName || "").toLowerCase();
        bValue = (b.ownerName || "").toLowerCase();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [businessUnits, searchTerm, statusFilter, balanceFilter, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedUnits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUnits = filteredAndSortedUnits.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  // Create business unit mutation
  const createUnitMutation = useMutation({
    mutationFn: async (unitData: typeof newUnitForm) => {
      return apiRequest("POST", "/api/admin/business-units", unitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      setNewUnitForm({ name: "", code: "", description: "" });
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

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitForm.name || !newUnitForm.code) {
      toast({ title: "Error", description: "Name and code are required", variant: "destructive" });
      return;
    }
    createUnitMutation.mutate(newUnitForm);
  };

  if (unitsLoading) {
    return <div className="flex items-center justify-center h-64">Loading business units...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Units Management</h2>
          <p className="text-gray-600">Create and manage business units with ownership transfer functionality</p>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Create Unit</TabsTrigger>
          <TabsTrigger value="overview">Business Units</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="business-ownership">Business Ownership Transfer</TabsTrigger>
        </TabsList>

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

        <TabsContent value="overview" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, code, description, or owner..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      resetPage();
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {viewMode === 'table' ? 'Grid View' : 'Table View'}
                </Button>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); resetPage(); }}
                  className="w-32 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={balanceFilter}
                  onChange={(e) => { setBalanceFilter(e.target.value as any); resetPage(); }}
                  className="w-36 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Balances</option>
                  <option value="low">Low (&lt; ₹500)</option>
                  <option value="medium">Medium (₹500-2000)</option>
                  <option value="high">High (&gt; ₹2000)</option>
                </select>

                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); resetPage(); }}
                  className="w-32 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>

                {/* Results Count */}
                <div className="text-sm text-gray-600 ml-auto">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedUnits.length)} of {filteredAndSortedUnits.length} units
                </div>
              </div>
            </div>
          </Card>

          {/* Table View */}
          {viewMode === 'table' ? (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 font-semibold"
                        >
                          Name
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left p-4">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('code')}
                          className="flex items-center gap-2 font-semibold"
                        >
                          Code
                          {sortField === 'code' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left p-4">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('walletBalance')}
                          className="flex items-center gap-2 font-semibold"
                        >
                          Wallet Balance
                          {sortField === 'walletBalance' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left p-4">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('isActive')}
                          className="flex items-center gap-2 font-semibold"
                        >
                          Status
                          {sortField === 'isActive' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left p-4">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('ownerName')}
                          className="flex items-center gap-2 font-semibold"
                        >
                          Business Owner
                          {sortField === 'ownerName' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left p-4">Machines</th>
                      <th className="text-left p-4">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnits.length > 0 ? (
                      paginatedUnits.map((unit: BusinessUnit) => (
                        <tr key={unit.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-tea-green" />
                              <span className="font-medium">{unit.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">{unit.code}</code>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-tea-green">₹{parseFloat(unit.walletBalance || "0").toFixed(2)}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant={unit.isActive ? "default" : "secondary"}>
                              {unit.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {unit.ownerName ? (
                              <span className="text-sm font-medium text-gray-900">{unit.ownerName}</span>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Unassigned
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            {unit.machines && unit.machines.length > 0 ? (
                              <div className="space-y-1">
                                {unit.machines.map((machine) => (
                                  <div key={machine.id} className="flex items-center gap-2 text-sm">
                                    <div className={`w-2 h-2 rounded-full ${machine.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span className="font-medium">{machine.name}</span>
                                    <span className="text-gray-500">({machine.location})</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                No machines
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 max-w-xs">
                            <p className="text-sm text-gray-600 truncate" title={unit.description || ""}>
                              {unit.description || "—"}
                            </p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          {filteredAndSortedUnits.length === 0 ? "No business units match your search criteria." : "No business units found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            /* Grid View (Original) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedUnits.length > 0 ? (
                paginatedUnits.map((unit: BusinessUnit) => (
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
                          <span className="font-medium text-tea-green">₹{parseFloat(unit.walletBalance || "0").toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Owner:</span>
                          {unit.ownerName ? (
                            <span className="font-medium">{unit.ownerName}</span>
                          ) : (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              Unassigned
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {unit.description && (
                        <p className="text-sm text-gray-600">{unit.description}</p>
                      )}
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Ownership transfer managed via Business Ownership tab
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No business units match your search criteria.</p>
                </div>
              )}
              
              {/* Grid Pagination */}
              {totalPages > 1 && (
                <div className="col-span-full">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <UserAssignmentInterface businessUnits={businessUnits || []} setActiveTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="business-ownership" className="space-y-6">
          <AdminTransferInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}