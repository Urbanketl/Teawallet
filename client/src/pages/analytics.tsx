import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, Coffee, Activity, Users, DollarSign, Calendar, Download, Building2 } from "lucide-react";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

// Type definitions for API responses
interface PeakHour {
  hour: number;
  count: number;
}

interface MachinePerformance {
  machineId: string;
  uptime: number;
  totalDispensed: number;
}

interface UserBehavior {
  avgTeaPerDay: string;
  preferredTimes: string[];
}

interface MachineDispensing {
  date: string;
  [key: string]: string | number;
}

interface BusinessUnitComparison {
  id: string;
  name: string;
  cupsDispensed: number;
  revenue: string;
  activeMachines: number;
  averagePerCup: string;
}

interface RevenueTrend {
  date: string;
  revenue: string;
  cups: number;
  avgPerCup: string;
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dateRange, setDateRange] = useState('7days');
  const [selectedMachine, setSelectedMachine] = useState('all');

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '1day':
        return { start: subDays(now, 1), end: now };
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case 'thisWeek':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Ensure filters trigger query refetches with proper dependencies
  const { data: peakHours = [] } = useQuery<PeakHour[]>({
    queryKey: ['/api/analytics/peak-hours', dateRange, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/peak-hours?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`).then(res => res.json()),
    enabled: user?.isAdmin,
  });

  const { data: machinePerformance = [] } = useQuery<MachinePerformance[]>({
    queryKey: ['/api/analytics/machine-performance', dateRange, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/machine-performance?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`).then(res => res.json()),
    enabled: user?.isAdmin,
  });

  const { data: userBehavior } = useQuery<UserBehavior>({
    queryKey: ['/api/analytics/user-behavior', dateRange, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/user-behavior?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`).then(res => res.json()),
    enabled: user?.isAdmin,
  });

  // Enhanced Analytics Queries
  const { data: businessUnitComparison = [] } = useQuery<BusinessUnitComparison[]>({
    queryKey: ['/api/analytics/business-unit-comparison', dateRange, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/business-unit-comparison?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`).then(res => res.json()),
    enabled: user?.isAdmin && user?.isSuperAdmin,
  });

  const { data: revenueTrends = [] } = useQuery<RevenueTrend[]>({
    queryKey: ['/api/analytics/revenue-trends', dateRange, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/revenue-trends?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`).then(res => res.json()),
    enabled: user?.isAdmin,
  });

  // New query for machine dispensing data
  const { data: machineDispensing = [] } = useQuery<MachineDispensing[]>({
    queryKey: ['/api/analytics/machine-dispensing', dateRange, selectedMachine, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/machine-dispensing?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}${selectedMachine !== 'all' ? `&machineId=${selectedMachine}` : ''}`).then(res => res.json()),
    enabled: user?.isAdmin,
  });

  // Get available machines for the filter
  const { data: allMachines = [] } = useQuery<any[]>({
    queryKey: user?.isSuperAdmin ? ['/api/admin/machines'] : ['/api/corporate/machines'],
    enabled: user?.isAdmin,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-warm">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Loading Analytics...</h3>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-warm">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Access Denied</h3>
              <p className="text-gray-500">You need business unit admin privileges to view analytics.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Analytics Dashboard</h1>
              <p className="text-gray-600">Employee tea consumption insights and business unit performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1day">Last 24 Hours</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Showing data from {format(startDate, 'MMM dd, yyyy')} to {format(endDate, 'MMM dd, yyyy')}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Tea Average</CardTitle>
              <Coffee className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBehavior?.avgTeaPerDay ? Number(userBehavior.avgTeaPerDay).toFixed(1) : '0.0'}</div>
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
                {userBehavior?.preferredTimes?.length > 0 ? userBehavior.preferredTimes.slice(0, 2).join('h, ') + 'h' : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">most active hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-tea-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{revenueTrends.reduce((sum, day) => sum + parseFloat(day.revenue), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">period revenue</p>
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

        {/* Enhanced Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    label={{ value: 'Cups Dispensed', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `₹${value}` : value,
                      name === 'revenue' ? 'Revenue' : 'Cups'
                    ]}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Daily Revenue (₹)" />
                  <Line yAxisId="right" type="monotone" dataKey="cups" stroke="#3b82f6" strokeWidth={2} name="Cups Dispensed" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={peakHours.map(item => ({ hour: `${item.hour}:00`, count: item.count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Time of Day', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    label={{ value: 'Tea Cups Dispensed', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value) => [`${value} cups`, 'Cups Dispensed']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} name="Usage Count" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Business Unit Comparison (Super Admin Only) */}
        {user?.isSuperAdmin && businessUnitComparison.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Unit Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={businessUnitComparison} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    label={{ value: 'Business Units', position: 'insideBottom', offset: -60 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    label={{ value: 'Cups Dispensed', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `₹${value}` : value,
                      name === 'revenue' ? 'Revenue' : 
                      name === 'cupsDispensed' ? 'Cups Dispensed' : 
                      name === 'activeMachines' ? 'Active Machines' : name
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cupsDispensed" fill="#22c55e" name="Cups Dispensed" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Machine Dispensing Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tea Machine Performance Analytics</CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {(allMachines as any[]).map((machine: any) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} ({machine.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Machine Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {(machinePerformance as any[]).map((machine: any) => (
                <Card key={machine.machineId} className="border-l-4 border-l-tea-green">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{machine.machineId}</CardTitle>
                      <div className={`w-3 h-3 rounded-full ${machine.uptime > 95 ? 'bg-green-400' : machine.uptime > 80 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <Badge variant="outline" className={`${machine.uptime > 95 ? 'text-green-600 border-green-200' : machine.uptime > 80 ? 'text-yellow-600 border-yellow-200' : 'text-red-600 border-red-200'}`}>
                        {machine.uptime}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Dispensed</span>
                      <span className="font-semibold text-tea-green">{machine.totalDispensed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Revenue Generated</span>
                      <span className="font-semibold">₹{(machine.totalDispensed * 5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg/Day</span>
                      <span className="text-sm font-medium">
                        {Math.round(machine.totalDispensed / Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))))} cups
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dispensing Chart */}
            {machineDispensing && (machineDispensing as any[]).length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium mb-4">Daily Dispensing Trends</h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={machineDispensing as any[]} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      label={{ value: 'Date', position: 'insideBottom', offset: -60 }}
                    />
                    <YAxis 
                      label={{ value: 'Cups Dispensed', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value, name) => [`${value} cups`, name]}
                    />
                    <Legend />
                    {selectedMachine === 'all' ? (
                      (allMachines as any[]).map((machine: any, index) => (
                        <Bar 
                          key={machine.id}
                          dataKey={machine.id}
                          name={machine.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))
                    ) : (
                      <Bar dataKey="dispensed" name="Cups Dispensed" fill="#22c55e" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Summary (if viewing monthly data) */}
            {dateRange === 'thisMonth' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-medium mb-3 text-blue-900">Monthly Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {(machinePerformance as any[]).reduce((sum: number, machine: any) => sum + machine.totalDispensed, 0)}
                    </div>
                    <div className="text-sm text-blue-700">Total Cups</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      ₹{((machinePerformance as any[]).reduce((sum: number, machine: any) => sum + machine.totalDispensed, 0) * 5).toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-700">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {(machinePerformance as any[]).filter((machine: any) => machine.uptime > 95).length}
                    </div>
                    <div className="text-sm text-blue-700">High Performing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {Math.round((machinePerformance as any[]).reduce((sum: number, machine: any) => sum + machine.uptime, 0) / Math.max(1, (machinePerformance as any[]).length))}%
                    </div>
                    <div className="text-sm text-blue-700">Avg Uptime</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  );
}