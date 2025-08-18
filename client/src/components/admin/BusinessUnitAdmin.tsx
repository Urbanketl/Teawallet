import { useState } from "react";
import { useBusinessUnits } from "@/hooks/useBusinessUnits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown,
  Edit3,
  Trash2,
  Wallet,
  Users,
  Coffee,
  TrendingUp,
  X
} from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";

interface BusinessUnitFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export default function BusinessUnitAdmin() {
  const {
    businessUnits,
    totalUnits,
    allBusinessUnits,
    unitsLoading,
    currentPage,
    setCurrentPage,
    unitsPerPage,
    setUnitsPerPage,
    totalPages,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createBusinessUnitMutation,
    updateBusinessUnitMutation,
    deleteBusinessUnitMutation,
    updateWalletMutation,
  } = useBusinessUnits();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [walletUnit, setWalletUnit] = useState<any>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletOperation, setWalletOperation] = useState<'recharge' | 'deduct'>('recharge');
  const [newUnit, setNewUnit] = useState<BusinessUnitFormData>({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleCreateUnit = () => {
    if (!newUnit.name || !newUnit.code) {
      return;
    }

    createBusinessUnitMutation.mutate(newUnit, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewUnit({
          name: "",
          code: "",
          description: "",
          isActive: true,
        });
      },
    });
  };

  const handleUpdateUnit = () => {
    if (!editingUnit) return;

    updateBusinessUnitMutation.mutate({
      unitId: editingUnit.id,
      unitData: editingUnit,
    }, {
      onSuccess: () => {
        setShowEditDialog(false);
        setEditingUnit(null);
      },
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    if (confirm("Are you sure you want to delete this business unit? This action cannot be undone.")) {
      deleteBusinessUnitMutation.mutate(unitId);
    }
  };

  const handleWalletOperation = () => {
    if (!walletUnit || !walletAmount || parseFloat(walletAmount) <= 0) {
      return;
    }

    updateWalletMutation.mutate({
      unitId: walletUnit.id,
      amount: parseFloat(walletAmount),
      type: walletOperation,
    }, {
      onSuccess: () => {
        setShowWalletDialog(false);
        setWalletUnit(null);
        setWalletAmount("");
      },
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const getStatusBadge = (unit: any) => {
    const balance = parseFloat(unit.walletBalance || '0');
    
    if (!unit.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (balance <= 100) {
      return <Badge variant="destructive">Critical Balance</Badge>;
    }
    
    if (balance <= 500) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Balance</Badge>;
    }
    
    return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Unit Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage business units, wallets, and organizational structure
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Business Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Business Unit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unit-name">Business Unit Name *</Label>
                <Input
                  id="unit-name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="e.g., Engineering Department"
                />
              </div>
              <div>
                <Label htmlFor="unit-code">Unit Code *</Label>
                <Input
                  id="unit-code"
                  value={newUnit.code}
                  onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., ENG"
                />
              </div>
              <div>
                <Label htmlFor="unit-description">Description</Label>
                <Textarea
                  id="unit-description"
                  value={newUnit.description}
                  onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
                  placeholder="Brief description of the business unit"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUnit}
                  disabled={createBusinessUnitMutation.isPending}
                >
                  {createBusinessUnitMutation.isPending ? "Creating..." : "Create Unit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              {totalUnits} total units
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="critical">Critical Balance</SelectItem>
                <SelectItem value="low">Low Balance</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Business Units Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Units ({totalUnits})</CardTitle>
        </CardHeader>
        <CardContent>
          {unitsLoading ? (
            <div className="text-center py-8">Loading business units...</div>
          ) : businessUnits.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No business units found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-6 gap-4 pb-3 border-b text-sm font-medium text-gray-600">
                <button 
                  onClick={() => handleSort('name')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Name
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => handleSort('code')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Code
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => handleSort('walletBalance')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Wallet Balance
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Status</span>
                <span>Created</span>
                <span>Actions</span>
              </div>

              {/* Unit Rows */}
              {businessUnits.map((unit: any) => (
                <div key={unit.id} className="lg:grid lg:grid-cols-6 gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="font-medium">
                    {unit.name}
                    <div className="text-xs text-gray-500 lg:hidden">
                      {unit.code}
                    </div>
                  </div>
                  <div className="hidden lg:block text-sm text-gray-600 font-mono">
                    {unit.code}
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-gray-400" />
                      ₹{parseFloat(unit.walletBalance || '0').toFixed(2)}
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(unit)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(unit.createdAt), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setWalletUnit(unit);
                        setShowWalletDialog(true);
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Wallet className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingUnit(unit);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalUnits}
                itemsPerPage={unitsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Unit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Business Unit</DialogTitle>
          </DialogHeader>
          {editingUnit && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Business Unit Name *</Label>
                <Input
                  id="edit-name"
                  value={editingUnit.name}
                  onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-code">Unit Code *</Label>
                <Input
                  id="edit-code"
                  value={editingUnit.code}
                  onChange={(e) => setEditingUnit({ ...editingUnit, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingUnit.description}
                  onChange={(e) => setEditingUnit({ ...editingUnit, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUnit}
                  disabled={updateBusinessUnitMutation.isPending}
                >
                  {updateBusinessUnitMutation.isPending ? "Updating..." : "Update Unit"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Management Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Wallet - {walletUnit?.name}</DialogTitle>
          </DialogHeader>
          {walletUnit && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Current Balance</div>
                <div className="text-2xl font-semibold text-green-600">
                  ₹{parseFloat(walletUnit.walletBalance || '0').toFixed(2)}
                </div>
              </div>
              
              <div>
                <Label htmlFor="wallet-operation">Operation</Label>
                <Select value={walletOperation} onValueChange={(value: any) => setWalletOperation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recharge">Add Funds (Recharge)</SelectItem>
                    <SelectItem value="deduct">Deduct Funds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="wallet-amount">Amount (₹)</Label>
                <Input
                  id="wallet-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowWalletDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleWalletOperation}
                  disabled={updateWalletMutation.isPending}
                  className={walletOperation === 'recharge' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {updateWalletMutation.isPending ? "Processing..." : 
                   walletOperation === 'recharge' ? "Add Funds" : "Deduct Funds"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}