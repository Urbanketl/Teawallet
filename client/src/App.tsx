import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Wallet from "@/pages/wallet";
import History from "@/pages/history";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Subscriptions from "@/pages/subscriptions";
import Loyalty from "@/pages/loyalty";
import Social from "@/pages/social";
import Support from "@/pages/support";
import Analytics from "@/pages/analytics";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/history" component={History} />
          <Route path="/profile" component={Profile} />
          <Route path="/admin" component={Admin} />
          <Route path="/subscriptions" component={Subscriptions} />
          <Route path="/loyalty" component={Loyalty} />
          <Route path="/social" component={Social} />
          <Route path="/support" component={Support} />
          <Route path="/analytics" component={Analytics} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
