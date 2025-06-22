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
  BarChart3
} from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/subscriptions", icon: Coffee, label: "Subscriptions" },
    { href: "/loyalty", icon: Award, label: "Loyalty" },
    { href: "/social", icon: Users, label: "Social" },
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
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo-updated.jpg" 
                  alt="UrbanKetl Logo" 
                  className="h-8 w-auto object-contain"
                />
              </div>
            </Link>
            
            <div className="hidden lg:flex items-center space-x-1">
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

          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-sm text-gray-600">
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
        </div>
      </div>
    </nav>
  );
}