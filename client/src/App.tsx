import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Lazy load pages for better performance
import { lazy, Suspense } from "react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Wallet = lazy(() => import("@/pages/wallet"));
const History = lazy(() => import("@/pages/history"));
const Admin = lazy(() => import("@/pages/admin"));
const Profile = lazy(() => import("@/pages/profile"));
const Support = lazy(() => import("@/pages/support"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Corporate = lazy(() => import("@/pages/corporate"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("Router state:", { isAuthenticated, isLoading });

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
    <Suspense fallback={<FullPageLoader message="Loading page..." />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/support" component={Support} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/corporate" component={Corporate} />
        <Route path="*" component={NotFound} />
      </Switch>
    </Suspense>
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
