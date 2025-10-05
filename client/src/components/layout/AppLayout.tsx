import { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "./Footer";

interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
}

export default function AppLayout({ children, showNavigation = true, showFooter = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-warm flex flex-col">
      {showNavigation && <Navigation />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}