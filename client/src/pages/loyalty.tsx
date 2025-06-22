import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Coffee, Star, Calendar, Trophy, Gift } from "lucide-react";
import { format } from "date-fns";

interface LoyaltyPoint {
  id: number;
  points: number;
  type: string;
  source: string;
  description: string;
  createdAt: string;
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface UserBadge {
  id: number;
  badgeId: number;
  earnedAt: string;
  badge: Badge;
}

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'badges'>('overview');

  const { data: pointsData } = useQuery({
    queryKey: ['/api/loyalty/points'],
  });

  const { data: history = [] } = useQuery({
    queryKey: ['/api/loyalty/history'],
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['/api/badges/user'],
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ['/api/badges'],
  });

  const currentPoints = pointsData?.points || 0;
  const earnedHistory = history.filter((h: LoyaltyPoint) => h.type === 'earned');
  const redeemedHistory = history.filter((h: LoyaltyPoint) => h.type === 'redeemed');

  const getNextMilestone = () => {
    const milestones = [100, 250, 500, 1000, 2500, 5000];
    return milestones.find(m => m > currentPoints) || 10000;
  };

  const getIconComponent = (iconName: string, className = "w-5 h-5") => {
    const icons: { [key: string]: any } = {
      coffee: Coffee,
      award: Award,
      star: Star,
      trophy: Trophy,
      gift: Gift,
    };
    const IconComponent = icons[iconName] || Star;
    return <IconComponent className={className} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loyalty Rewards</h1>
          <p className="text-gray-600">Earn points with every tea and unlock exclusive rewards</p>
        </div>

        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-tea-green to-tea-dark text-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Current Points</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{currentPoints.toLocaleString()}</div>
              <p className="text-tea-green-100">Available for redemption</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-tea-green" />
                <span>Next Milestone</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{currentPoints}</span>
                  <span>{getNextMilestone()}</span>
                </div>
                <Progress 
                  value={(currentPoints / getNextMilestone()) * 100} 
                  className="h-2"
                />
                <p className="text-sm text-gray-600">
                  {getNextMilestone() - currentPoints} points to next reward
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-tea-green" />
                <span>Badges Earned</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-tea-green mb-2">{userBadges.length}</div>
              <p className="text-gray-600">out of {allBadges.length} available</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Star },
                { id: 'history', label: 'Points History', icon: Calendar },
                { id: 'badges', label: 'Achievements', icon: Award },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-tea-green text-tea-green'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How to Earn Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-tea-green/5 rounded-lg">
                    <Coffee className="w-8 h-8 text-tea-green mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Purchase Tea</h3>
                    <p className="text-sm text-gray-600">1 point per ₹10 spent</p>
                  </div>
                  <div className="text-center p-4 bg-tea-green/5 rounded-lg">
                    <Award className="w-8 h-8 text-tea-green mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Earn Badges</h3>
                    <p className="text-sm text-gray-600">Bonus points for achievements</p>
                  </div>
                  <div className="text-center p-4 bg-tea-green/5 rounded-lg">
                    <Gift className="w-8 h-8 text-tea-green mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Refer Friends</h3>
                    <p className="text-sm text-gray-600">50 points per successful referral</p>
                  </div>
                  <div className="text-center p-4 bg-tea-green/5 rounded-lg">
                    <Star className="w-8 h-8 text-tea-green mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Daily Bonus</h3>
                    <p className="text-sm text-gray-600">Extra points for consistent usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Redeem Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Free Tea</h3>
                      <p className="text-sm text-gray-600">Get any premium tea for free</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-tea-green">100 points</div>
                      <Button variant="outline" size="sm" disabled={currentPoints < 100}>
                        Redeem
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">₹50 Wallet Credit</h3>
                      <p className="text-sm text-gray-600">Add money directly to your wallet</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-tea-green">500 points</div>
                      <Button variant="outline" size="sm" disabled={currentPoints < 500}>
                        Redeem
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Premium Subscription</h3>
                      <p className="text-sm text-gray-600">1 month free premium subscription</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-tea-green">1000 points</div>
                      <Button variant="outline" size="sm" disabled={currentPoints < 1000}>
                        Redeem
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Points Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {earnedHistory.slice(0, 5).map((point: LoyaltyPoint) => (
                      <div key={point.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{point.description}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(point.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          +{point.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Points Redeemed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {redeemedHistory.length > 0 ? (
                      redeemedHistory.slice(0, 5).map((point: LoyaltyPoint) => (
                        <div key={point.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{point.description}</p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(point.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            -{Math.abs(point.points)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No redemptions yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBadges.map((badge: Badge) => {
                const isEarned = userBadges.some((ub: UserBadge) => ub.badgeId === badge.id);
                const earnedBadge = userBadges.find((ub: UserBadge) => ub.badgeId === badge.id);
                
                return (
                  <Card 
                    key={badge.id} 
                    className={`${isEarned ? 'bg-tea-green/5 border-tea-green' : 'bg-gray-50'}`}
                  >
                    <CardHeader className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        isEarned ? 'bg-tea-green text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {getIconComponent(badge.icon, "w-8 h-8")}
                      </div>
                      <CardTitle className={`${isEarned ? 'text-tea-green' : 'text-gray-500'}`}>
                        {badge.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <Badge variant={isEarned ? "default" : "outline"} className={isEarned ? "bg-tea-green" : ""}>
                          {badge.points} points
                        </Badge>
                        {isEarned && earnedBadge && (
                          <Badge variant="outline" className="text-tea-green border-tea-green">
                            Earned {format(new Date(earnedBadge.earnedAt), 'MMM yyyy')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}