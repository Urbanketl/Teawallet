import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

  // Check authentication status
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
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