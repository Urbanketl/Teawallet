import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
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
