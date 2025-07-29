import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check for pseudo login parameter
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const pseudoParam = urlParams?.get('pseudo');
  
  // Build query key with pseudo parameter if present
  const queryKey = pseudoParam ? `/api/auth/user?pseudo=${pseudoParam}` : "/api/auth/user";
  
  const { data: user, isLoading } = useQuery({
    queryKey: [queryKey],
    retry: false,
  });



  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

export function logout() {
  // Redirect to logout endpoint
  window.location.href = '/api/logout';
}
