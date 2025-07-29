import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { PseudoLoginBanner } from "@/components/PseudoLoginBanner";
import { FullPageLoader } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Lazy load pages for better performance
import { lazy, Suspense } from "react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Wallet = lazy(() => import("@/pages/wallet"));

const Admin = lazy(() => import("@/pages/admin"));
const Profile = lazy(() => import("@/pages/profile"));
const Support = lazy(() => import("@/pages/support"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Corporate = lazy(() => import("@/pages/corporate"));

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
      <Suspense fallback={<FullPageLoader message="Loading page..." />}>
        <Landing />
      </Suspense>
    );
  }

  return (
    <>
      {/* Show pseudo login banner when in test mode */}
      {pseudoParam && (
        <PseudoLoginBanner 
          pseudoUserId={pseudoParam} 
          userName={pseudoUser ? `${pseudoUser.firstName} ${pseudoUser.lastName}` : undefined}
        />
      )}
      
      <Suspense fallback={<FullPageLoader message="Loading page..." />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/wallet" component={Wallet} />

          <Route path="/profile" component={Profile} />
          <Route path="/admin" component={Admin} />
          <Route path="/support" component={Support} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/corporate" component={Corporate} />
          <Route path="*" component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
