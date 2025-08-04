import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { PseudoLoginBanner } from "@/components/PseudoLoginBanner";
import { FullPageLoader } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Import pages directly to avoid lazy loading issues during debugging
import { Suspense } from "react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Support from "@/pages/support";
import Analytics from "@/pages/analytics";
import Corporate from "@/pages/corporate";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("Router state:", { isAuthenticated, isLoading });

  // Check for pseudo login parameter
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const pseudoParam = urlParams?.get('pseudo');

  // Get pseudo user info for banner
  const { data: pseudoUser } = useQuery({
    queryKey: [`/api/admin/user/${pseudoParam}`],
    enabled: !!pseudoParam,
    retry: false,
  });

  if (isLoading) {
    return <FullPageLoader message="Loading application..." />;
  }

  // Prevent double rendering by using single component instead of Switch
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  return (
    <>
      {/* Show pseudo login banner when in test mode */}
      {pseudoParam && (
        <PseudoLoginBanner 
          pseudoUserId={pseudoParam} 
          userName={pseudoUser ? `${(pseudoUser as any).firstName} ${(pseudoUser as any).lastName}` : undefined}
        />
      )}
      
      <Switch>
        <Route path="/" component={Corporate} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/support" component={Support} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
