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
import { Suspense, useState, useEffect } from "react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Support from "@/pages/support";
import Analytics from "@/pages/analytics";
import Corporate from "@/pages/corporate";
import WalletPage from "@/pages/wallet";
import PaymentCallback from "@/pages/payment-callback";
import RechargeHistoryPage from "@/pages/recharge-history";
import PricingPolicy from "@/pages/policies/pricing";
import TermsAndConditions from "@/pages/policies/terms";
import PrivacyPolicy from "@/pages/policies/privacy";
import RefundPolicy from "@/pages/policies/refund";
import ContactUs from "@/pages/contact";
import AboutUs from "@/pages/about";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [pseudoParam, setPseudoParam] = useState<string | null>(null);

  console.log("Router state:", { isAuthenticated, isLoading });

  // Read pseudo parameter from URL after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const pseudo = searchParams.get('pseudo');
      console.log('Router: Reading pseudo from URL:', window.location.search, '-> pseudo =', pseudo);
      setPseudoParam(pseudo);
    }
  }, []);

  // Get pseudo user info for banner
  const { data: pseudoUser } = useQuery({
    queryKey: [`/api/admin/user/${pseudoParam}`],
    enabled: !!pseudoParam,
    retry: false,
  });

  if (isLoading) {
    return <FullPageLoader message="Loading application..." />;
  }

  // Policy pages are always public (Razorpay compliance)
  return (
    <>
      {/* Show pseudo login banner when in test mode */}
      {isAuthenticated && pseudoParam && (
        <PseudoLoginBanner 
          pseudoUserId={pseudoParam} 
          userName={pseudoUser ? `${(pseudoUser as any).firstName} ${(pseudoUser as any).lastName}` : undefined}
        />
      )}
      
      <Switch>
        {/* Public pages - accessible without authentication */}
        <Route path="/about" component={AboutUs} />
        <Route path="/contact" component={ContactUs} />
        <Route path="/policies/pricing" component={PricingPolicy} />
        <Route path="/policies/terms" component={TermsAndConditions} />
        <Route path="/policies/privacy" component={PrivacyPolicy} />
        <Route path="/policies/refund" component={RefundPolicy} />
        
        {/* Authentication page */}
        <Route path="/auth" component={AuthPage} />
        
        {/* Protected routes - require authentication */}
        {isAuthenticated ? (
          <>
            <Route path="/" component={Corporate} />
            <Route path="/wallet" component={WalletPage} />
            <Route path="/wallet/payment-callback" component={PaymentCallback} />
            <Route path="/recharge-history" component={RechargeHistoryPage} />
            <Route path="/profile" component={Profile} />
            <Route path="/admin" component={Admin} />
            <Route path="/support" component={Support} />
            <Route path="/analytics" component={Analytics} />
            <Route component={NotFound} />
          </>
        ) : (
          <Route path="*" component={AuthPage} />
        )}
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
