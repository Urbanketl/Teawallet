import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Use state to track pseudo parameter - ensures it updates after window loads
  const [pseudoParam, setPseudoParam] = useState<string | null>(null);

  // Read pseudo parameter from URL after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const pseudo = searchParams.get('pseudo');
      console.log('useAuth: Reading pseudo from URL:', window.location.search, '-> pseudo =', pseudo);
      setPseudoParam(pseudo);
    }
  }, []); // Run once on mount

  // Check authentication status
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user", pseudoParam],
    queryFn: async () => {
      const url = pseudoParam ? `/api/auth/user?pseudo=${pseudoParam}` : "/api/auth/user";
      console.log('useAuth: Fetching user from:', url);
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (response.status === 401) {
        return null; // Return null for unauthenticated state instead of throwing
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: pseudoParam !== null || typeof window === 'undefined' || !window.location.search.includes('pseudo'), // Only run when pseudo is loaded or not needed
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (!data.requiresPasswordReset) {
        // Force refetch the user data to update authentication state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Navigate to dashboard after successful authentication
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/auth";
    },
  });

  return {
    user: user || null,
    isAuthenticated: !!user && !error,
    isLoading,
    loginMutation,
    logoutMutation,
  };
}

export function logout() {
  // Redirect to logout endpoint
  window.location.href = '/api/logout';
}