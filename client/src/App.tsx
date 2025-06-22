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
const Subscriptions = lazy(() => import("@/pages/subscriptions"));
const Social = lazy(() => import("@/pages/social"));
const Support = lazy(() => import("@/pages/support"));
const Analytics = lazy(() => import("@/pages/analytics"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader message="Loading application..." />;
  }

  return (
    <Suspense fallback={<FullPageLoader message="Loading page..." />}>
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="*" component={Landing} />
          </>
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/history" component={History} />
            <Route path="/profile" component={Profile} />
            <Route path="/admin" component={Admin} />
            <Route path="/subscriptions" component={Subscriptions} />
            <Route path="/social" component={Social} />
            <Route path="/support" component={Support} />
            <Route path="/analytics" component={Analytics} />
            <Route path="*" component={NotFound} />
          </>
        )}
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
