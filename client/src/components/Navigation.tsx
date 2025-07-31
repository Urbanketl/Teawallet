import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import logoImage from "@assets/URBAN KETL Logo small_1750439431697.jpg";
import { 
  LayoutDashboard, 
  Wallet, 
  User as UserIcon, 
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
  
  // Type the user object properly
  const typedUser = user as User | null;

  // Check for pseudo login parameter and preserve it across navigation
  const urlParams = new URLSearchParams(window.location.search);
  const pseudoParam = urlParams.get('pseudo');
  const pseudoQuery = pseudoParam ? `?pseudo=${pseudoParam}` : '';

  if (isLoading || !typedUser) return null;

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/corporate", icon: Coffee, label: "Business Unit" },
    { href: "/wallet", icon: Wallet, label: "Business Wallet" },

    { href: "/support", icon: MessageCircle, label: "Business Support" },
    { href: "/profile", icon: UserIcon, label: "Profile" },
  ];

  // Analytics for all admins
  if (typedUser.isAdmin || typedUser.isSuperAdmin) {
    navItems.push(
      { href: "/analytics", icon: BarChart3, label: "Analytics" }
    );
  }

  // Admin Dashboard only for super admins
  if (typedUser.isSuperAdmin) {
    navItems.push(
      { href: "/admin", icon: Shield, label: "Platform Admin" }
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={pseudoQuery ? `/${pseudoQuery}` : "/"}>
              <div className="flex items-center space-x-3">
                <img 
                  src={logoImage} 
                  alt="UrbanKetl Logo" 
                  className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-1 bg-white shadow-sm"
                  style={{ minWidth: '80px', height: '64px', maxWidth: '120px' }}
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                    console.log('Logo src:', logoImage);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully:', logoImage);
                  }}
                />
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 ml-8">
              {navItems.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={`${href}${pseudoQuery}`}>
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
              {/* Show pseudo login indicator */}
              {pseudoParam && (
                <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-xs text-amber-800 font-medium">Test Mode</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = window.location.pathname}
                    className="h-auto p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-200"
                  >
                    Exit
                  </Button>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Welcome, {typedUser.firstName}
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
                            src={logoImage} 
                            alt="UrbanKetl Logo" 
                            className="h-16 w-auto object-contain"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">Welcome, {typedUser.firstName}</p>
                              {pseudoParam && (
                                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Test</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{typedUser.email}</p>
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
                            <Link key={href} href={`${href}${pseudoQuery}`}>
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
                        
                        <div className="mt-6 pt-4 border-t space-y-2">
                          {/* Exit Test Mode Button */}
                          {pseudoParam && (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                window.location.href = window.location.pathname;
                              }}
                              className="w-full justify-start text-left flex items-center bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                            >
                              <div className="w-5 h-5 mr-3 bg-amber-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✕</span>
                              </div>
                              <span>Exit Test Mode</span>
                            </Button>
                          )}
                          
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