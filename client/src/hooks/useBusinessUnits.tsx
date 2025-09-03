import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useBusinessUnits() {
  const [currentPage, setCurrentPage] = useState(1);
  const [unitsPerPage, setUnitsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch business units with pagination
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units", currentPage, unitsPerPage, searchTerm, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: unitsPerPage.toString(),
        paginated: 'true',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/admin/business-units?${params}`);
      if (!response.ok) throw new Error('Failed to fetch business units');
      return response.json();
    },
  });

  // Fetch all business units (non-paginated)
  const { data: allBusinessUnits = [] } = useQuery({
    queryKey: ["/api/admin/business-units"],
  });

  // Create business unit mutation
  const createBusinessUnitMutation = useMutation({
    mutationFn: async (unitData: any) => {
      const response = await apiRequest("POST", "/api/admin/business-units", unitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({
        title: "Success",
        description: "Business unit created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create business unit",
        variant: "destructive",
      });
    },
  });

  // Update business unit mutation
  const updateBusinessUnitMutation = useMutation({
    mutationFn: async ({ unitId, unitData }: { unitId: string; unitData: any }) => {
      const response = await apiRequest("PUT", `/api/admin/business-units/${unitId}`, unitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({
        title: "Success",
        description: "Business unit updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business unit",
        variant: "destructive",
      });
    },
  });

  // Delete business unit mutation
  const deleteBusinessUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/business-units/${unitId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({
        title: "Success",
        description: "Business unit deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete business unit",
        variant: "destructive",
      });
    },
  });

  // Update wallet balance mutation
  const updateWalletMutation = useMutation({
    mutationFn: async ({ unitId, amount, type }: { unitId: string; amount: number; type: 'recharge' | 'deduct' }) => {
      const response = await apiRequest("POST", `/api/admin/business-units/${unitId}/wallet`, { amount, type });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({
        title: "Success",
        description: "Wallet updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update wallet",
        variant: "destructive",
      });
    },
  });

  // Transfer ownership mutation
  const transferOwnershipMutation = useMutation({
    mutationFn: async ({ unitId, newOwnerId }: { unitId: string; newOwnerId: string }) => {
      const response = await apiRequest("POST", `/api/admin/business-units/${unitId}/transfer-ownership`, { newOwnerId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-units"] });
      toast({
        title: "Success",
        description: "Ownership transferred successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer ownership",
        variant: "destructive",
      });
    },
  });

  // Get business unit analytics mutation
  const getBusinessUnitAnalytics = useMutation({
    mutationFn: async ({ unitIds, startDate, endDate }: { unitIds: string[]; startDate: string; endDate: string }) => {
      const params = new URLSearchParams({
        businessUnitIds: unitIds.join(','),
        startDate,
        endDate
      });
      const response = await fetch(`/api/admin/business-units/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  return {
    // Data
    businessUnits: unitsData?.units || [],
    totalUnits: unitsData?.total || 0,
    allBusinessUnits,
    unitsLoading,

    // Pagination
    currentPage,
    setCurrentPage,
    unitsPerPage,
    setUnitsPerPage,
    totalPages: Math.ceil((unitsData?.total || 0) / unitsPerPage),

    // Filtering & Sorting
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Mutations
    createBusinessUnitMutation,
    updateBusinessUnitMutation,
    deleteBusinessUnitMutation,
    updateWalletMutation,
    transferOwnershipMutation,
    getBusinessUnitAnalytics,
  };
}