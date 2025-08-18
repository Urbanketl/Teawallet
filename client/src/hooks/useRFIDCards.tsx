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

  // Fetch all RFID cards (the API returns simple array)
  const { data: allCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["/api/admin/rfid/cards"],
    queryFn: async () => {
      const response = await fetch("/api/admin/rfid/cards", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch RFID cards');
      return response.json();
    },
  });

  // Client-side filtering and pagination
  const filteredCards = allCards.filter((card: any) => {
    const matchesSearch = !searchTerm || 
      card.cardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.cardName && card.cardName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (card.hardwareUid && card.hardwareUid.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && card.isActive) ||
      (statusFilter === 'inactive' && !card.isActive);
    
    const matchesBusinessUnit = businessUnitFilter === 'all' || 
      (businessUnitFilter === 'unassigned' && !card.businessUnitId) ||
      card.businessUnitId === businessUnitFilter;
    
    const matchesCardType = cardTypeFilter === 'all' || 
      (cardTypeFilter === 'desfire' && card.cardType === 'desfire');
    
    return matchesSearch && matchesStatus && matchesBusinessUnit && matchesCardType;
  });

  // Client-side sorting
  const sortedCards = [...filteredCards].sort((a: any, b: any) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });

  // Client-side pagination
  const totalCards = sortedCards.length;
  const totalPages = Math.ceil(totalCards / cardsPerPage);
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const cards = sortedCards.slice(startIndex, endIndex);

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
    cards,
    totalCards,
    cardsLoading,

    // Pagination
    currentPage,
    setCurrentPage,
    cardsPerPage,
    setCardsPerPage,
    totalPages,

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