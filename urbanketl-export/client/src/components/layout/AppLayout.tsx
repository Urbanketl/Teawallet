import { ReactNode } from "react";
import Navigation from "@/components/Navigation";

interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
}

export default function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-warm">
      {showNavigation && <Navigation />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}