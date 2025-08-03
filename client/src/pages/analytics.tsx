import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Clock, Coffee, Activity, Users, DollarSign, Calendar, Download, Building2, Filter, RefreshCw, Maximize2, Eye, BarChart3 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import type { User } from "@shared/schema";

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
  const typedUser = user as User;
  const [dateRange, setDateRange] = useState('7days');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range with custom date support
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
      case 'custom':
        if (customStartDate && customEndDate) {
          return { 
            start: new Date(customStartDate), 
            end: new Date(customEndDate) 
          };
        }
        // Fallback to last 7 days if custom dates not set
        return { start: subDays(now, 7), end: now };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Debug current filter state
  console.log('Current filter state:', {
    dateRange,
    selectedBusinessUnit,
    selectedMachine,
    customStartDate,
    customEndDate,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd')
  });

  // Enhanced Analytics Queries with complete filter support
  const buildQueryParams = (extraParams: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
      ...extraParams
    });
    
    if (selectedBusinessUnit && selectedBusinessUnit !== 'all') {
      params.set('businessUnitId', selectedBusinessUnit);
    }
    
    if (selectedMachine && selectedMachine !== 'all') {
      params.set('machineId', selectedMachine);
    }
    
    return params.toString();
  };

  const { data: peakHours = [] } = useQuery<PeakHour[]>({
    queryKey: ['/api/analytics/peak-hours', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => {
      const url = `/api/analytics/peak-hours?${buildQueryParams()}`;
      console.log('Peak Hours Query URL:', url);
      return fetch(url).then(res => res.json());
    },
    enabled: Boolean(typedUser?.isAdmin),
  });

  const { data: machinePerformance = [] } = useQuery<MachinePerformance[]>({
    queryKey: ['/api/analytics/machine-performance', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/machine-performance?${buildQueryParams()}`).then(res => res.json()),
    enabled: Boolean(typedUser?.isAdmin),
  });

  const { data: userBehavior } = useQuery<UserBehavior>({
    queryKey: ['/api/analytics/user-behavior', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/user-behavior?${buildQueryParams()}`).then(res => res.json()),
    enabled: Boolean(typedUser?.isAdmin),
  });

  const { data: businessUnitComparison = [] } = useQuery<BusinessUnitComparison[]>({
    queryKey: ['/api/analytics/business-unit-comparison', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => {
      // For business unit comparison, don't filter by specific business unit - show all units but with date filtering
      const params = new URLSearchParams({
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      });
      const url = `/api/analytics/business-unit-comparison?${params.toString()}`;
      console.log('Business Unit Comparison Query URL:', url);
      return fetch(url).then(res => res.json());
    },
    enabled: Boolean(typedUser?.isAdmin && typedUser?.isSuperAdmin),
  });

  const { data: revenueTrends = [] } = useQuery<RevenueTrend[]>({
    queryKey: ['/api/analytics/revenue-trends', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/revenue-trends?${buildQueryParams()}`).then(res => res.json()),
    enabled: Boolean(typedUser?.isAdmin),
  });

  const { data: machineDispensing = [] } = useQuery<MachineDispensing[]>({
    queryKey: ['/api/analytics/machine-dispensing', dateRange, selectedBusinessUnit, selectedMachine, customStartDate, customEndDate, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/analytics/machine-dispensing?${buildQueryParams()}`).then(res => res.json()),
    enabled: Boolean(typedUser?.isAdmin),
  });

  // Get available machines for the filter
  const { data: allMachines = [] } = useQuery<any[]>({
    queryKey: typedUser?.isSuperAdmin ? ['/api/admin/machines'] : ['/api/corporate/machines'],
    enabled: Boolean(typedUser?.isAdmin),
  });

  // Filter machines based on selected business unit
  const filteredMachines = React.useMemo(() => {
    if (!selectedBusinessUnit || selectedBusinessUnit === 'all') {
      return allMachines;
    }
    return allMachines.filter((machine: any) => machine.businessUnitId === selectedBusinessUnit);
  }, [allMachines, selectedBusinessUnit]);

  // Reset machine selection when business unit changes
  React.useEffect(() => {
    if (selectedBusinessUnit && selectedBusinessUnit !== 'all') {
      if (selectedMachine !== 'all' && !filteredMachines.find((m: any) => m.id === selectedMachine)) {
        setSelectedMachine('all');
      }
    }
  }, [selectedBusinessUnit, filteredMachines, selectedMachine]);

  // Get business units for super admin filtering
  const { data: allBusinessUnits = [] } = useQuery<any[]>({
    queryKey: ['/api/corporate/business-units'],
    enabled: Boolean(typedUser?.isAdmin && typedUser?.isSuperAdmin),
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

  if (!isAuthenticated || !typedUser?.isAdmin) {
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

  const COLORS = [
    '#F49E1B', // Pantone Gold Fusion (primary brand color)
    '#22c55e', // Tea Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899'  // Pink
  ];

  // Auto refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        // Force refresh all queries using react-query's invalidation
        import('@/lib/queryClient').then(({ queryClient }) => {
          queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
        });
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-[#F49E1B]" />
                Business Analytics Dashboard
              </h1>
              <p className="text-gray-600">Real-time insights into tea consumption patterns and business performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-[#F49E1B] hover:bg-[#E8940D]" : ""}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Enhanced Filters */}
          <Card className="mb-6 shadow-sm border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#F49E1B]" />
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Time Period</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select 
                      value={dateRange} 
                      onChange={(e) => {
                        console.log('Date range changed to:', e.target.value);
                        setDateRange(e.target.value);
                      }}
                      className="flex-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="1day">Last 24 Hours</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="thisWeek">This Week</option>
                      <option value="thisMonth">This Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                </div>

                {typedUser?.isSuperAdmin && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Business Unit</Label>
                    <select 
                      value={selectedBusinessUnit} 
                      onChange={(e) => {
                        console.log('Business unit changed to:', e.target.value);
                        setSelectedBusinessUnit(e.target.value);
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="all">All Business Units</option>
                      {allBusinessUnits.map((bu: any) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Machine Filter</Label>
                  <select 
                    value={selectedMachine} 
                    onChange={(e) => {
                      console.log('Machine changed to:', e.target.value);
                      setSelectedMachine(e.target.value);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="all">All Machines</option>
                    {(filteredMachines as any[]).map((machine: any) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name || machine.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">View Mode</Label>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                      <TabsTrigger value="detailed" className="text-xs">Detailed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
            📊 Showing data from <span className="font-medium text-gray-700">{format(startDate, 'MMM dd, yyyy')}</span> to <span className="font-medium text-gray-700">{format(endDate, 'MMM dd, yyyy')}</span>
            {autoRefresh && <span className="ml-4 text-green-600">🔄 Auto-refreshing every 30 seconds</span>}
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Daily Tea Average</CardTitle>
              <div className="w-10 h-10 bg-[#F49E1B] rounded-full flex items-center justify-center">
                <Coffee className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {userBehavior?.avgTeaPerDay ? Number(userBehavior.avgTeaPerDay).toFixed(1) : '0.0'}
              </div>
              <p className="text-sm text-gray-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                cups per day
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Peak Hours</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {userBehavior?.preferredTimes && userBehavior.preferredTimes.length > 0 
                  ? userBehavior.preferredTimes.slice(0, 2).join('h, ') + 'h' 
                  : 'N/A'}
              </div>
              <p className="text-sm text-gray-600">most active hours</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Revenue</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{revenueTrends.reduce((sum, day) => sum + parseFloat(day.revenue), 0).toFixed(2)}
              </div>
              <p className="text-sm text-gray-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                period revenue
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Active Machines</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{machinePerformance.length}</div>
              <p className="text-sm text-gray-600">machines monitored</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Analytics Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsContent value="overview">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Revenue Trends */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Revenue Trends</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Daily revenue and cup dispensing patterns</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Quick Date Selection for Trends */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          dateRange === '7days' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setDateRange('7days')}
                      >
                        7d
                      </button>
                      <button
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          dateRange === '30days' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setDateRange('30days')}
                      >
                        30d
                      </button>
                      <button
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          dateRange === '90days' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        onClick={() => setDateRange('90days')}
                      >
                        90d
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullscreen(isFullscreen === 'revenue' ? null : 'revenue')}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {revenueTrends.length === 0 && (
                    <div className="flex items-center justify-center h-[350px] text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No revenue data available for selected period</p>
                        <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                      </div>
                    </div>
                  )}
                  {revenueTrends.length > 0 && (
                    <ResponsiveContainer width="100%" height={isFullscreen === 'revenue' ? 500 : 350}>
                    <AreaChart data={revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F49E1B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F49E1B" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="cupsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#666' }}
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: '#666' }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#666' }}
                        tickFormatter={(value) => `${value} cups`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [
                          name === 'Daily Revenue' ? `₹${Number(value).toFixed(2)}` : `${value} cups`,
                          name === 'Daily Revenue' ? 'Daily Revenue' : 'Cups Dispensed'
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#F49E1B" 
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        name="Daily Revenue" 
                      />
                      <Area 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="cups" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        fill="url(#cupsGradient)"
                        name="Cups Dispensed" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
                  
                  {revenueTrends.length > 0 && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Total Revenue</p>
                        <p className="text-lg font-semibold text-[#F49E1B]">
                          ₹{revenueTrends.reduce((sum, day) => sum + parseFloat(day.revenue), 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Cups</p>
                        <p className="text-lg font-semibold text-green-600">
                          {revenueTrends.reduce((sum, day) => sum + day.cups, 0)} cups
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Avg per Cup</p>
                        <p className="text-lg font-semibold text-gray-700">
                          ₹{(() => {
                            const totalRevenue = revenueTrends.reduce((sum, day) => sum + parseFloat(day.revenue), 0);
                            const totalCups = revenueTrends.reduce((sum, day) => sum + day.cups, 0);
                            return totalCups > 0 ? (totalRevenue / totalCups).toFixed(2) : '0.00';
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Peak Usage Hours</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Hourly consumption patterns throughout the day</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(isFullscreen === 'peak' ? null : 'peak')}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={isFullscreen === 'peak' ? 500 : 350}>
                    <BarChart 
                      data={peakHours.map(item => ({ hour: `${item.hour}:00`, count: item.count }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12, fill: '#666' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#666' }}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value) => [`${value} cups`, 'Cups Dispensed']}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#F49E1B" 
                        radius={[4, 4, 0, 0]}
                        name="Usage Count"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detailed">
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Detailed Analytics View</h3>
              <p className="text-gray-500">Advanced charts and machine-specific metrics coming soon</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Business Unit Comparison (Super Admin Only) */}
        {typedUser?.isSuperAdmin && businessUnitComparison.length > 0 && (
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-[#F49E1B]" />
                  Business Unit Performance Comparison
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Cross-unit revenue and consumption analysis</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(isFullscreen === 'business' ? null : 'business')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={isFullscreen === 'business' ? 600 : 450}>
                <BarChart 
                  data={businessUnitComparison} 
                  margin={{ top: 20, right: 40, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#666' }}
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickFormatter={(value) => `${value}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 12, fill: '#666' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `₹${Number(value).toFixed(2)}` : value,
                      name === 'revenue' ? 'Revenue' : 
                      name === 'cupsDispensed' ? 'Cups Dispensed' : 
                      name === 'activeMachines' ? 'Active Machines' : name
                    ]}
                    labelFormatter={(label) => `Business Unit: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="cupsDispensed" 
                    fill="#22c55e" 
                    name="Cups Dispensed"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="revenue" 
                    fill="#F49E1B" 
                    name="Revenue (₹)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Machine Performance Analytics */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Coffee className="h-6 w-6 text-[#F49E1B]" />
                Machine Performance Analytics
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Individual machine dispensing trends and performance metrics</p>
            </div>
            <div className="flex items-center gap-3">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(isFullscreen === 'machines' ? null : 'machines')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Enhanced Machine Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {(machinePerformance as any[]).map((machine: any, index) => (
                <Card 
                  key={machine.machineId} 
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        Machine {machine.machineId}
                      </CardTitle>
                      <div className={`w-3 h-3 rounded-full ${machine.uptime > 95 ? 'bg-green-400' : machine.uptime > 80 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Uptime</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                machine.uptime > 95 ? 'bg-green-500' : 
                                machine.uptime > 80 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${machine.uptime}%` }}
                            />
                          </div>
                          <Badge variant="outline" className={`text-xs ${
                            machine.uptime > 95 ? 'text-green-600 border-green-200' : 
                            machine.uptime > 80 ? 'text-yellow-600 border-yellow-200' : 
                            'text-red-600 border-red-200'
                          }`}>
                            {machine.uptime}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Dispensed</span>
                        <span className="font-semibold text-[#F49E1B]">
                          {machine.totalDispensed.toLocaleString()} cups
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revenue Generated</span>
                        <span className="font-semibold text-green-600">
                          ₹{(machine.totalDispensed * 5).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Daily Average</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.round(machine.totalDispensed / Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))))} cups/day
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced Dispensing Chart */}
            {machineDispensing && (machineDispensing as any[]).length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F49E1B]" />
                  Daily Dispensing Trends
                </h4>
                <ResponsiveContainer width="100%" height={isFullscreen === 'machines' ? 500 : 400}>
                  <BarChart 
                    data={machineDispensing as any[]} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#666' }}
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#666' }}
                      tickFormatter={(value) => `${value} cups`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
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
                          radius={[2, 2, 0, 0]}
                        />
                      ))
                    ) : (
                      <Bar 
                        dataKey="dispensed" 
                        name="Cups Dispensed" 
                        fill="#F49E1B"
                        radius={[4, 4, 0, 0]}
                      />
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