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

  // Check for demo mode
  const demoUser = typeof window !== 'undefined' ? localStorage.getItem('demo_user') : null;
  const demoAuthenticated = typeof window !== 'undefined' ? localStorage.getItem('demo_authenticated') : null;

  if (demoAuthenticated === 'true' && demoUser) {
    return {
      user: JSON.parse(demoUser),
      isLoading: false,
      isAuthenticated: true,
    };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

export function logout() {
  // Clear demo mode if active
  if (typeof window !== 'undefined') {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_authenticated');
  }
  
  // Redirect to logout endpoint
  window.location.href = '/api/logout';
}
