import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, Key, ArrowRight, Coffee, CreditCard, BarChart3, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    resetToken: ""
  });

  // Redirect if already authenticated
  if (user && !requiresPasswordReset) {
    navigate("/");
    return null;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      if (result.requiresPasswordReset) {
        setRequiresPasswordReset(true);
        setUserId(result.userId);
        toast({
          title: "Password Reset Required",
          description: "You must reset your password before continuing",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        // The useAuth hook will handle the navigation automatically
        // once the authentication state is updated
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      toast({
        title: "Reset Email Sent",
        description: data.message,
      });

      // In development, show the reset token
      if (data.resetToken) {
        console.log("Development reset token:", data.resetToken);
        toast({
          title: "Development Mode",
          description: `Reset token: ${data.resetToken}`,
        });
      }

      setShowResetPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.resetToken || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.resetToken,
          password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password",
      });

      // Reset form and go back to login
      setFormData({ email: "", password: "", newPassword: "", confirmPassword: "", resetToken: "" });
      setShowResetPassword(false);
      setRequiresPasswordReset(false);
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in both password fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: formData.password,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast({
        title: "Password Changed Successfully",
        description: "You can now access the system",
      });

      setRequiresPasswordReset(false);
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const getPasswordRequirements = () => (
    <div className="text-xs text-gray-600 mt-2">
      <p>Password requirements:</p>
      <ul className="list-disc list-inside mt-1 space-y-1">
        <li>At least 8 characters long</li>
        <li>Contains uppercase and lowercase letters</li>
        <li>Contains at least one number</li>
        <li>Contains at least one special character</li>
      </ul>
    </div>
  );

  // First-time password reset form
  if (requiresPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tea-green/5 to-tea-brown/5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-tea-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              You need to change your password before accessing the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFirstTimePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {getPasswordRequirements()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form (forgot password)
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tea-green/5 to-tea-brown/5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-tea-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive reset instructions or use the reset token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Send Reset Instructions
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetToken">Reset Token</Label>
                  <Input
                    id="resetToken"
                    type="text"
                    value={formData.resetToken}
                    onChange={(e) => handleInputChange("resetToken", e.target.value)}
                    placeholder="Enter reset token"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPasswordReset">New Password</Label>
                  <Input
                    id="newPasswordReset"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  />
                  {formData.newPassword && getPasswordRequirements()}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPasswordReset">Confirm New Password</Label>
                  <Input
                    id="confirmPasswordReset"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowResetPassword(false)}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main login form
  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-tea-green rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Welcome to UrbanKetl</CardTitle>
            <CardDescription>
              Sign in to your business unit account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Forgot your password?
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t text-center text-xs text-gray-500">
              <p>Need an account? Contact your platform administrator.</p>
              <p>Admins create and share login credentials securely.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-orange-400 to-amber-700 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border border-white/20 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white/20 rounded-full"></div>
        </div>
        
        <div className="text-center text-white max-w-lg relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white rounded-xl shadow-lg mx-auto flex items-center justify-center p-3">
              <Coffee className="w-12 h-12 text-tea-green" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Premium Tea at Your
            <br />
            <span className="text-tea-light">Fingertips</span>
          </h1>
          
          <p className="text-xl opacity-90 mb-8 leading-relaxed">
            Experience seamless tea dispensing with our digital wallet and RFID card system. 
            Recharge once, enjoy everywhere in your corporate network.
          </p>
          
          <div className="grid grid-cols-1 gap-4 text-left">
            <div className="flex items-start space-x-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <CreditCard className="w-6 h-6 text-tea-light mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-lg">RFID Card Technology</div>
                <div className="text-sm opacity-80">Simply tap your card and enjoy instant tea dispensing with automatic payment</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <Smartphone className="w-6 h-6 text-tea-light mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-lg">Digital Wallet System</div>
                <div className="text-sm opacity-80">Secure online recharge with Razorpay integration and real-time balance tracking</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-6 h-6 text-tea-light mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-lg">Business Intelligence</div>
                <div className="text-sm opacity-80">Complete usage analytics, reporting, and expense management for corporate teams</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/20">
            <div className="text-sm opacity-80 mb-1">Join thousands of companies using</div>
            <div className="text-2xl font-bold">Smart Corporate Tea Solutions</div>
          </div>
        </div>
      </div>
    </div>
  );
}