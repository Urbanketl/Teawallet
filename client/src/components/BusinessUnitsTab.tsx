import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BusinessUnit } from "@shared/schema";
import { AdminTransferInterface } from "./AdminTransferInterface";

interface BusinessUnitWithDetails extends BusinessUnit {
  userCount?: number;
  machineCount?: number;
}

export function BusinessUnitsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUnitForm, setNewUnitForm] = useState({
    name: "",
    code: "",
    description: ""
  });

  // Fetch business units
  const { data: businessUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units"],
    retry: false,
  });

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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Unit</TabsTrigger>
          <TabsTrigger value="business-ownership">Business Ownership</TabsTrigger>
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
                <p className="text-gray-500">No business units found. Create one to get started.</p>
              </div>
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