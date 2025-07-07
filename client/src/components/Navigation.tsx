import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
    { href: "/corporate", icon: Coffee, label: "Manage Business" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/history", icon: History, label: "History" },
    { href: "/support", icon: MessageCircle, label: "Support" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  if (user.isSuperAdmin) {
    navItems.push(
      { href: "/admin", icon: Shield, label: "Platform Admin" },
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

              {/* Custom Mobile Menu Overlay */}
              {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  
                  {/* Menu Panel */}
                  <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center space-x-3">
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
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Navigation Items */}
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-2">
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
                        </div>
                        
                        <div className="mt-6 pt-4 border-t">
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}