import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  User, 
  LogOut,
  Shield,
  Coffee,
  Award,
  Users,
  MessageCircle,
  BarChart3,
  Menu
} from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading || !user) return null;

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/history", icon: History, label: "History" },
    { href: "/support", icon: MessageCircle, label: "Support" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  if (user.isAdmin) {
    navItems.push(
      { href: "/admin", icon: Shield, label: "Admin" },
      { href: "/analytics", icon: BarChart3, label: "Analytics" }
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo-updated.jpg" 
                  alt="UrbanKetl Logo" 
                  className="h-8 w-auto object-contain"
                />
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 ml-8">
              {navItems.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={location === href ? "default" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      location === href 
                        ? "bg-tea-green hover:bg-tea-dark text-white" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - Desktop Welcome + Logout, Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Desktop Welcome and Logout */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.firstName}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>

            {/* Mobile Navigation Menu */}
            <div className="lg:hidden">
              <button
                onClick={() => {
                  console.log("Menu button clicked, current state:", mobileMenuOpen);
                  setMobileMenuOpen(true);
                }}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col space-y-4 mt-8">
                    <div className="flex items-center space-x-3 pb-4 border-b">
                      <img 
                        src="/logo-updated.jpg" 
                        alt="UrbanKetl Logo" 
                        className="h-8 w-auto object-contain"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Welcome, {user.firstName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    
                    {navItems.map(({ href, icon: Icon, label }) => (
                      <Link key={href} href={href}>
                        <Button
                          variant={location === href ? "default" : "ghost"}
                          size="lg"
                          className={`w-full justify-start text-left ${
                            location === href 
                              ? "bg-tea-green hover:bg-tea-dark text-white" 
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          <span>{label}</span>
                        </Button>
                      </Link>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.location.href = '/api/logout';
                        }}
                        className="w-full justify-start text-left flex items-center"
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}