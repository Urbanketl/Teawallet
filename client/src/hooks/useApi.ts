import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Common query keys for cache management
export const queryKeys = {
  user: () => ['/api/auth/user'] as const,
  transactions: () => ['/api/transactions'] as const,
  rfidCard: () => ['/api/rfid/card'] as const,
  dispensingHistory: () => ['/api/dispensing/history'] as const,
  subscriptionPlans: () => ['/api/subscriptions/plans'] as const,
  userSubscription: () => ['/api/subscriptions/user'] as const,
  supportTickets: () => ['/api/support/tickets'] as const,
  faqArticles: (category?: string) => ['/api/support/faq', category] as const,
  adminUsers: () => ['/api/admin/users'] as const,
  adminStats: () => ['/api/admin/stats'] as const,
  adminMachines: () => ['/api/admin/machines'] as const,
  adminSupportTickets: () => ['/api/admin/support/tickets'] as const,
  analytics: {
    popularTeas: () => ['/api/analytics/popular-teas'] as const,
    peakHours: () => ['/api/analytics/peak-hours'] as const,
    machinePerformance: () => ['/api/analytics/machine-performance'] as const,
    userBehavior: () => ['/api/analytics/user-behavior'] as const,
  },
} as const;

// Custom hooks for common API operations
export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions(),
  });
}

export function useRfidCard() {
  return useQuery({
    queryKey: queryKeys.rfidCard(),
  });
}

export function useDispensingHistory() {
  return useQuery({
    queryKey: queryKeys.dispensingHistory(),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiRequest('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets() });
    },
  });
}