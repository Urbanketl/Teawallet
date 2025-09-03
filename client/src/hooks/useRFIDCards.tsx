import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useRFIDCards() {
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage, setCardsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("all");
  const [cardTypeFilter, setCardTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch RFID cards with pagination
  const { data: cardsData, isLoading: cardsLoading } = useQuery({
    queryKey: ["/api/admin/rfid-cards", currentPage, cardsPerPage, searchTerm, statusFilter, businessUnitFilter, cardTypeFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: cardsPerPage.toString(),
        paginated: 'true',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(businessUnitFilter !== 'all' && { businessUnitId: businessUnitFilter }),
        ...(cardTypeFilter !== 'all' && { cardType: cardTypeFilter }),
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/admin/rfid-cards?${params}`);
      if (!response.ok) throw new Error('Failed to fetch RFID cards');
      return response.json();
    },
  });

  // Create RFID card mutation
  const createRFIDCardMutation = useMutation({
    mutationFn: async (cardData: any) => {
      const response = await apiRequest("POST", "/api/admin/rfid-cards", cardData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
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

  // Batch create RFID cards mutation
  const batchCreateRFIDCardsMutation = useMutation({
    mutationFn: async (batchData: any) => {
      const response = await apiRequest("POST", "/api/admin/rfid-cards/batch", batchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
      toast({
        title: "Success",
        description: "RFID cards created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFID cards",
        variant: "destructive",
      });
    },
  });

  // Update RFID card mutation
  const updateRFIDCardMutation = useMutation({
    mutationFn: async ({ cardId, cardData }: { cardId: string; cardData: any }) => {
      const response = await apiRequest("PUT", `/api/admin/rfid-cards/${cardId}`, cardData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
      toast({
        title: "Success",
        description: "RFID card updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update RFID card",
        variant: "destructive",
      });
    },
  });

  // Deactivate RFID card mutation
  const deactivateRFIDCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/rfid-cards/${cardId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
      toast({
        title: "Success",
        description: "RFID card deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate RFID card",
        variant: "destructive",
      });
    },
  });

  // Activate RFID card mutation
  const activateRFIDCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await apiRequest("PUT", `/api/admin/rfid-cards/${cardId}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
      toast({
        title: "Success",
        description: "RFID card activated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate RFID card",
        variant: "destructive",
      });
    },
  });

  // Assign RFID card mutation
  const assignRFIDCardMutation = useMutation({
    mutationFn: async ({ cardId, businessUnitId }: { cardId: string; businessUnitId: string }) => {
      const response = await apiRequest("PUT", `/api/admin/rfid-cards/${cardId}/assign`, { businessUnitId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfid-cards"] });
      toast({
        title: "Success",
        description: "RFID card assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign RFID card",
        variant: "destructive",
      });
    },
  });

  return {
    // Data
    cards: cardsData?.cards || [],
    totalCards: cardsData?.total || 0,
    cardsLoading,

    // Pagination
    currentPage,
    setCurrentPage,
    cardsPerPage,
    setCardsPerPage,
    totalPages: Math.ceil((cardsData?.total || 0) / cardsPerPage),

    // Filtering & Sorting
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    businessUnitFilter,
    setBusinessUnitFilter,
    cardTypeFilter,
    setCardTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Mutations
    createRFIDCardMutation,
    batchCreateRFIDCardsMutation,
    updateRFIDCardMutation,
    deactivateRFIDCardMutation,
    activateRFIDCardMutation,
    assignRFIDCardMutation,
  };
}