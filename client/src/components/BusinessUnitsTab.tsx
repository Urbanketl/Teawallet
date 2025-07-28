import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface BusinessUnitWithDetails extends BusinessUnit {
  userCount?: number;
  machineCount?: number;
}

type SortField = 'name' | 'code' | 'walletBalance' | 'isActive' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function BusinessUnitsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
        (unit.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Business Units</TabsTrigger>
          <TabsTrigger value="create">Create Unit</TabsTrigger>
          <TabsTrigger value="business-ownership">Business Ownership</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, code, or description..."
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
                
                <Select value={statusFilter} onValueChange={(value: any) => { setStatusFilter(value); resetPage(); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={balanceFilter} onValueChange={(value: any) => { setBalanceFilter(value); resetPage(); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="low">Low (&lt; ₹500)</SelectItem>
                    <SelectItem value="medium">Medium (₹500-2000)</SelectItem>
                    <SelectItem value="high">High (&gt; ₹2000)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(parseInt(value)); resetPage(); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>

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
                          <td className="p-4 max-w-xs">
                            <p className="text-sm text-gray-600 truncate" title={unit.description || ""}>
                              {unit.description || "—"}
                            </p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
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

        <TabsContent value="business-ownership" className="space-y-6">
          <AdminTransferInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}