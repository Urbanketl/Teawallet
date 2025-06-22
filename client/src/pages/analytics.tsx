import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, Coffee, Activity, Users, DollarSign } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data: popularTeas = [] } = useQuery({
    queryKey: ['/api/analytics/popular-teas'],
    enabled: user?.isAdmin,
  });

  const { data: peakHours = [] } = useQuery({
    queryKey: ['/api/analytics/peak-hours'],
    enabled: user?.isAdmin,
  });

  const { data: machinePerformance = [] } = useQuery({
    queryKey: ['/api/analytics/machine-performance'],
    enabled: user?.isAdmin,
  });

  const { data: userBehavior } = useQuery({
    queryKey: ['/api/analytics/user-behavior'],
    enabled: user?.isAdmin,
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Access Denied</h3>
              <p className="text-gray-500">You need admin privileges to view analytics.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Tea Average</CardTitle>
              <Coffee className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBehavior?.avgTeaPerDay?.toFixed(1) || 0}</div>
              <p className="text-xs text-muted-foreground">teas per day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
              <Clock className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userBehavior?.preferredTimes?.slice(0, 2)?.join(', ') || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">most active hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Tea Types</CardTitle>
              <TrendingUp className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBehavior?.topTeaTypes?.length || 0}</div>
              <p className="text-xs text-muted-foreground">varieties consumed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
              <Activity className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{machinePerformance.length}</div>
              <p className="text-xs text-muted-foreground">machines monitored</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Popular Tea Types */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Tea Types (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={popularTeas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="teaType" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Tea Consumption by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Machine Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Machine Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machinePerformance.map((machine: any) => (
                <Card key={machine.machineId} className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{machine.machineId}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <Badge variant="outline" className="text-green-600">
                        {machine.uptime}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Dispensed</span>
                      <span className="font-semibold">{machine.totalDispensed}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tea Types Distribution */}
        {userBehavior?.topTeaTypes && userBehavior.topTeaTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tea Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userBehavior.topTeaTypes.map((tea: string, index: number) => ({
                        name: tea,
                        value: Math.random() * 100, // Mock data for visualization
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userBehavior.topTeaTypes.map((entry: string, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  <h4 className="font-semibold">Top Preferences</h4>
                  {userBehavior.topTeaTypes.slice(0, 5).map((tea: string, index: number) => (
                    <div key={tea} className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{tea}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}