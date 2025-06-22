import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Coffee, Calendar, Users } from "lucide-react";

interface SubscriptionPlan {
  id: number;
  name: string;
  type: string;
  teaCount: number;
  price: string;
  discount: string;
  isActive: boolean;
}

interface UserSubscription {
  id: number;
  planId: number;
  remainingTeas: number;
  startDate: string;
  endDate: string;
  status: string;
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
  });

  const { data: userSubscription } = useQuery({
    queryKey: ['/api/subscriptions/user'],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiRequest('/api/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Subscription created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/user'] });
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create subscription",
        variant: "destructive" 
      });
    },
  });

  const calculateSavings = (plan: SubscriptionPlan) => {
    const regularPrice = plan.teaCount * 7; // Assuming ₹7 per tea
    const discountAmount = (parseFloat(plan.discount) / 100) * regularPrice;
    return discountAmount.toFixed(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tea Subscriptions</h1>
          <p className="text-gray-600">Choose a subscription plan and save on your daily tea</p>
        </div>

        {/* Current Subscription */}
        {userSubscription && (
          <Card className="mb-8 border-tea-green">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coffee className="w-5 h-5 text-tea-green" />
                <span>Active Subscription</span>
                <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                  {userSubscription.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Remaining Teas</p>
                  <p className="text-2xl font-bold text-tea-green">{userSubscription.remainingTeas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valid Until</p>
                  <p className="text-lg font-semibold">{new Date(userSubscription.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant="outline" className="text-tea-green border-tea-green">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            plans.map((plan: SubscriptionPlan) => (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  selectedPlan === plan.id ? 'ring-2 ring-tea-green' : ''
                } ${plan.type === 'monthly' && plan.teaCount === 100 ? 'border-tea-green bg-tea-green/5' : ''}`}
              >
                {plan.type === 'monthly' && plan.teaCount === 100 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-tea-green text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-tea-green">₹{plan.price}</div>
                    <div className="text-sm text-gray-600">per {plan.type}</div>
                    {parseFloat(plan.discount) > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {plan.discount}% OFF
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-tea-green" />
                      <span className="text-sm">{plan.teaCount} premium teas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-tea-green" />
                      <span className="text-sm">All tea varieties included</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-tea-green" />
                      <span className="text-sm">No expiry on unused teas</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-tea-green" />
                      <span className="text-sm">Priority customer support</span>
                    </div>
                    {parseFloat(plan.discount) > 0 && (
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-tea-green" />
                        <span className="text-sm font-medium text-green-600">
                          Save ₹{calculateSavings(plan)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full"
                    variant={plan.type === 'monthly' && plan.teaCount === 100 ? "default" : "outline"}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      subscribeMutation.mutate(plan.id);
                    }}
                    disabled={subscribeMutation.isPending || (userSubscription && userSubscription.status === 'active')}
                  >
                    {subscribeMutation.isPending && selectedPlan === plan.id ? (
                      "Processing..."
                    ) : userSubscription && userSubscription.status === 'active' ? (
                      "Already Subscribed"
                    ) : (
                      "Choose Plan"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Benefits Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-tea-green" />
              <span>Subscription Benefits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coffee className="w-6 h-6 text-tea-green" />
                </div>
                <h3 className="font-semibold mb-1">Bulk Savings</h3>
                <p className="text-sm text-gray-600">Save up to 20% with subscription plans</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-tea-green" />
                </div>
                <h3 className="font-semibold mb-1">No Expiry</h3>
                <p className="text-sm text-gray-600">Unused teas never expire</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-tea-green" />
                </div>
                <h3 className="font-semibold mb-1">All Varieties</h3>
                <p className="text-sm text-gray-600">Access to all premium tea types</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-tea-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-tea-green" />
                </div>
                <h3 className="font-semibold mb-1">Priority Support</h3>
                <p className="text-sm text-gray-600">Dedicated customer support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}