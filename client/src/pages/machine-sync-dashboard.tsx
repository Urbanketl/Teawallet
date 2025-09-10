import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RotateCw, 
  RefreshCw, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Server, 
  Wifi,
  WifiOff,
  Shield,
  Key,
  Activity,
  History,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface MachineStatus {
  machine: {
    id: string;
    name: string;
    location: string;
    businessUnitId: string;
    isActive: boolean;
    price: string;
  };
  businessUnitName: string;
  syncStatus: string;
  lastSync: string | null;
  cardsCount: number;
  isOnline: boolean;
}

interface SyncLog {
  id: number;
  machineId: string;
  machineName: string;
  syncType: string;
  syncStatus: string;
  dataPushed?: any;
  errorMessage?: string;
  cardsUpdated: number;
  createdAt: string;
}

interface AuthLog {
  id: number;
  machineId: string;
  machineName: string;
  businessUnitId: string;
  businessUnitName: string;
  cardNumber: string;
  authMethod: string;
  authResult: string;
  challengeData?: any;
  responseData?: any;
  createdAt: string;
}

interface UpiSyncLog {
  id: number;
  syncType: string;
  startDate: string;
  endDate: string;
  recordsFound: number;
  recordsProcessed: number;
  recordsSkipped: number;
  syncStatus: string;
  errorMessage?: string;
  responseTime: number;
  triggeredBy: string;
  createdAt: string;
}

interface UpiTransaction {
  id: number;
  machineId: string;
  amount: string;
  cups: number;
  success: boolean;
  upiPaymentId?: string;
  upiVpa?: string;
  externalTransactionId?: string;
  createdAt: string;
  externalCreatedAt?: string;
}

interface UpiTransactionsResponse {
  transactions: UpiTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UpiSyncStatus {
  stats: {
    totalSyncs: number;
    successfulSyncs: number;
    lastSyncDate: string | null;
    totalTransactionsProcessed: number;
  };
  recentLogs: UpiSyncLog[];
  totalUpiTransactions: number;
}

interface UpiAnalytics {
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: string;
    totalRevenue: string;
    totalCups: number;
    averageRevenuePerTransaction: string;
  };
  machineStats: Array<{
    machineId: string;
    totalTransactions: number;
    successfulTransactions: number;
    revenue: number;
    cups: number;
  }>;
}

export default function MachineSyncDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [syncFilter, setSyncFilter] = useState('all');
  const [authFilter, setAuthFilter] = useState('all');
  const [upiTransactionsPage, setUpiTransactionsPage] = useState(1);
  const [upiTransactionsLimit] = useState(20);

  // Fetch all machine statuses
  const { 
    data: machineStatuses = [], 
    isLoading: isLoadingMachines,
    refetch: refetchMachines
  } = useQuery<MachineStatus[]>({
    queryKey: ['/api/admin/sync/machines'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch sync logs
  const { 
    data: syncLogs = [], 
    isLoading: isLoadingSyncLogs,
    refetch: refetchSyncLogs
  } = useQuery<SyncLog[]>({
    queryKey: ['/api/admin/sync/logs'],
  });

  // Fetch auth logs
  const { 
    data: authLogs = [], 
    isLoading: isLoadingAuthLogs,
    refetch: refetchAuthLogs
  } = useQuery<AuthLog[]>({
    queryKey: ['/api/admin/sync/auth-logs'],
  });

  // Fetch UPI sync status
  const { 
    data: upiSyncStatus, 
    isLoading: isLoadingUpiSync,
    refetch: refetchUpiSync
  } = useQuery<UpiSyncStatus>({
    queryKey: ['/api/admin/upi-sync/status'],
  });

  // Fetch UPI sync logs
  const { 
    data: upiSyncLogs = [], 
    isLoading: isLoadingUpiSyncLogs,
    refetch: refetchUpiSyncLogs
  } = useQuery<UpiSyncLog[]>({
    queryKey: ['/api/admin/upi-sync/logs'],
  });

  // Fetch UPI transactions with pagination
  const { 
    data: upiTransactionsData, 
    isLoading: isLoadingUpiTransactions,
    refetch: refetchUpiTransactions
  } = useQuery<UpiTransactionsResponse>({
    queryKey: ['/api/admin/upi-sync/transactions', upiTransactionsPage, upiTransactionsLimit],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/upi-sync/transactions?page=${upiTransactionsPage}&limit=${upiTransactionsLimit}`);
      return response.json();
    }
  });
  
  const upiTransactions = upiTransactionsData?.transactions || [];
  const upiPagination = upiTransactionsData?.pagination;

  // Export functions
  const handleExportExcel = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/upi-sync/export/excel');
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UPI-Transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "UPI transactions exported to Excel file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export UPI transactions",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/upi-sync/export/pdf');
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UPI-Transactions-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "UPI transactions exported to PDF file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export UPI transactions",
        variant: "destructive",
      });
    }
  };

  // Fetch UPI analytics
  const { 
    data: upiAnalytics, 
    isLoading: isLoadingUpiAnalytics,
    refetch: refetchUpiAnalytics
  } = useQuery<UpiAnalytics>({
    queryKey: ['/api/admin/upi-sync/analytics'],
  });

  // Individual machine sync mutation
  const syncMachineMutation = useMutation({
    mutationFn: async (machineId: string) => {
      const res = await apiRequest('POST', `/api/admin/sync/machines/${machineId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Machine Sync Success",
        description: data.message,
      });
      refetchMachines();
      refetchSyncLogs();
    },
    onError: (error) => {
      toast({
        title: "Machine Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk sync mutation
  const bulkSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/sync/bulk');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Sync Completed",
        description: `${data.results.synced} machines synced, ${data.results.failed} failed`,
      });
      refetchMachines();
      refetchSyncLogs();
    },
    onError: (error) => {
      toast({
        title: "Bulk Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Key rotation mutation
  const rotateKeysMutation = useMutation({
    mutationFn: async (businessUnitId: string) => {
      const res = await apiRequest('POST', `/api/admin/sync/rotate-keys/${businessUnitId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Key Rotation Success",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Key Rotation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // UPI sync mutations
  const upiInitialSyncMutation = useMutation({
    mutationFn: async (daysBack: number = 90) => {
      const res = await apiRequest('POST', '/api/admin/upi-sync/initial', { daysBack });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "UPI Initial Sync Success",
        description: data.message,
      });
      refetchUpiSync();
      refetchUpiSyncLogs();
      refetchUpiTransactions();
      refetchUpiAnalytics();
    },
    onError: (error) => {
      toast({
        title: "UPI Initial Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upiDailySyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/upi-sync/daily');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "UPI Daily Sync Success",
        description: data.message,
      });
      refetchUpiSync();
      refetchUpiSyncLogs();
      refetchUpiTransactions();
      refetchUpiAnalytics();
    },
    onError: (error) => {
      toast({
        title: "UPI Daily Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upiManualSyncMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const res = await apiRequest('POST', '/api/admin/upi-sync/manual', { startDate, endDate });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "UPI Manual Sync Success",
        description: data.message,
      });
      refetchUpiSync();
      refetchUpiSyncLogs();
      refetchUpiTransactions();
      refetchUpiAnalytics();
    },
    onError: (error) => {
      toast({
        title: "UPI Manual Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOnlineStatusBadge = (isOnline: boolean) => {
    return isOnline ? (
      <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>
    ) : (
      <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>
    );
  };

  const filteredSyncLogs = syncLogs.filter(log => 
    syncFilter === 'all' || log.syncStatus === syncFilter
  );

  const filteredAuthLogs = authLogs.filter(log => 
    authFilter === 'all' || log.authResult === authFilter
  );

  const onlineMachines = machineStatuses.filter(m => m.isOnline).length;
  const syncedMachines = machineStatuses.filter(m => m.syncStatus === 'synced').length;
  const failedMachines = machineStatuses.filter(m => m.syncStatus === 'failed').length;
  const pendingMachines = machineStatuses.filter(m => m.syncStatus === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Machine Sync Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage DESFire card synchronization across all machines</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetchMachines()}
            variant="outline"
            disabled={isLoadingMachines}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMachines ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => bulkSyncMutation.mutate()}
            disabled={bulkSyncMutation.isPending}
          >
            <RotateCw className="w-4 h-4 mr-2" />
            {bulkSyncMutation.isPending ? 'Syncing All...' : 'Sync All Machines'}
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machineStatuses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineMachines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synced</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{syncedMachines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedMachines + pendingMachines}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Machine Status</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="auth-logs">Auth Logs</TabsTrigger>
          <TabsTrigger value="upi-sync">UPI Sync</TabsTrigger>
          <TabsTrigger value="security">Security & Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machine Sync Status</CardTitle>
              <CardDescription>Real-time status of all tea machines and their card synchronization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Business Unit</TableHead>
                      <TableHead>Online Status</TableHead>
                      <TableHead>Sync Status</TableHead>
                      <TableHead>Cards Loaded</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineStatuses.map((machine) => (
                      <TableRow key={machine.machine.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{machine.machine.name}</div>
                            <div className="text-sm text-gray-500">{machine.machine.location}</div>
                          </div>
                        </TableCell>
                        <TableCell>{machine.businessUnitName || 'Unassigned'}</TableCell>
                        <TableCell>{getOnlineStatusBadge(machine.isOnline)}</TableCell>
                        <TableCell>{getSyncStatusBadge(machine.syncStatus)}</TableCell>
                        <TableCell>{machine.cardsCount}</TableCell>
                        <TableCell>
                          {machine.lastSync ? format(new Date(machine.lastSync), 'MMM d, HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => syncMachineMutation.mutate(machine.machine.id)}
                            disabled={syncMachineMutation.isPending || !machine.machine.businessUnitId}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Sync
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Synchronization Logs</CardTitle>
                  <CardDescription>History of card synchronization operations</CardDescription>
                </div>
                <Select value={syncFilter} onValueChange={setSyncFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Sync Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cards Updated</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSyncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.machineName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.syncType}</Badge>
                        </TableCell>
                        <TableCell>{getSyncStatusBadge(log.syncStatus)}</TableCell>
                        <TableCell>{log.cardsUpdated}</TableCell>
                        <TableCell>{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                        <TableCell>
                          {log.errorMessage && (
                            <span className="text-red-600 text-sm">{log.errorMessage}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>RFID Authentication Logs</CardTitle>
                  <CardDescription>Real-time authentication attempts and challenge-response logs</CardDescription>
                </div>
                <Select value={authFilter} onValueChange={setAuthFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Business Unit</TableHead>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuthLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.machineName}</TableCell>
                        <TableCell>{log.businessUnitName}</TableCell>
                        <TableCell className="font-mono text-sm">{log.cardNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center">
                            <Shield className="w-3 h-3 mr-1" />
                            {log.authMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.authResult === 'success' ? (
                            <Badge variant="default" className="bg-green-500">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upi-sync" className="space-y-4">
          {/* UPI Analytics Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                UPI Transaction Analytics (Last 30 Days)
              </CardTitle>
              <CardDescription>Comprehensive overview of all UPI transactions across all machines</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUpiAnalytics ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading analytics...
                </div>
              ) : upiAnalytics ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700">{upiAnalytics.summary.totalTransactions}</div>
                        <div className="text-sm text-blue-600">Total Transactions</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">₹{upiAnalytics.summary.totalRevenue}</div>
                        <div className="text-sm text-green-600">Total Revenue</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-700">{upiAnalytics.summary.totalCups}</div>
                        <div className="text-sm text-purple-600">Cups Dispensed</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-700">{upiAnalytics.summary.successRate}%</div>
                        <div className="text-sm text-orange-600">Success Rate</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Machine Performance Breakdown */}
                  {upiAnalytics.machineStats && upiAnalytics.machineStats.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Machine Performance</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Machine ID</TableHead>
                              <TableHead>Total Transactions</TableHead>
                              <TableHead>Successful</TableHead>
                              <TableHead>Success Rate</TableHead>
                              <TableHead>Revenue</TableHead>
                              <TableHead>Cups</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {upiAnalytics.machineStats.map((machine) => (
                              <TableRow key={machine.machineId}>
                                <TableCell className="font-mono">{machine.machineId}</TableCell>
                                <TableCell>{machine.totalTransactions}</TableCell>
                                <TableCell>
                                  <span className="text-green-600">{machine.successfulTransactions}</span>
                                  <span className="text-gray-400">/{machine.totalTransactions}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {machine.totalTransactions > 0 
                                      ? `${Math.round((machine.successfulTransactions / machine.totalTransactions) * 100)}%`
                                      : '0%'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">₹{machine.revenue.toFixed(2)}</TableCell>
                                <TableCell>{machine.cups}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">Avg Revenue/Transaction</div>
                      <div className="text-xl text-green-600">₹{upiAnalytics.summary.averageRevenuePerTransaction}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">Failed Transactions</div>
                      <div className="text-xl text-red-600">{upiAnalytics.summary.failedTransactions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">Successful Transactions</div>
                      <div className="text-xl text-green-600">{upiAnalytics.summary.successfulTransactions}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No UPI analytics data available. Perform initial sync to populate analytics.
                </div>
              )}
            </CardContent>
          </Card>

          {/* UPI Sync Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  UPI Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUpiSync ? (
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : upiSyncStatus ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Syncs:</span>
                      <span className="font-medium">{upiSyncStatus.stats.totalSyncs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate:</span>
                      <span className="font-medium">
                        {upiSyncStatus.stats.totalSyncs > 0 
                          ? `${Math.round((upiSyncStatus.stats.successfulSyncs / upiSyncStatus.stats.totalSyncs) * 100)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Sync:</span>
                      <span className="font-medium">
                        {upiSyncStatus.stats.lastSyncDate 
                          ? format(new Date(upiSyncStatus.stats.lastSyncDate), 'MMM d, HH:mm')
                          : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Transactions:</span>
                      <span className="font-medium">{upiSyncStatus.stats.totalTransactionsProcessed}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No sync data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Initial Sync</CardTitle>
                <CardDescription>Pull historical UPI transaction data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => upiInitialSyncMutation.mutate(90)}
                  disabled={upiInitialSyncMutation.isPending}
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  {upiInitialSyncMutation.isPending ? 'Syncing...' : 'Sync Last 90 Days'}
                </Button>
                <Button
                  onClick={() => upiInitialSyncMutation.mutate(30)}
                  disabled={upiInitialSyncMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  {upiInitialSyncMutation.isPending ? 'Syncing...' : 'Sync Last 30 Days'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Sync</CardTitle>
                <CardDescription>Trigger sync operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => upiDailySyncMutation.mutate()}
                  disabled={upiDailySyncMutation.isPending}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {upiDailySyncMutation.isPending ? 'Syncing...' : 'Trigger Daily Sync'}
                </Button>
                <Button
                  onClick={() => refetchUpiSync()}
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* UPI Sync Logs */}
          <Card>
            <CardHeader>
              <CardTitle>UPI Sync Logs</CardTitle>
              <CardDescription>History of UPI transaction synchronization operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sync Type</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUpiSyncLogs ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Loading UPI sync logs...
                        </TableCell>
                      </TableRow>
                    ) : upiSyncLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No UPI sync operations yet. Click "Sync Last 90 Days" to begin.
                        </TableCell>
                      </TableRow>
                    ) : (
                      upiSyncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.syncType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(log.startDate), 'MMM d')} - {format(new Date(log.endDate), 'MMM d')}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Found: {log.recordsFound}</div>
                              <div>Processed: <span className="text-green-600">{log.recordsProcessed}</span></div>
                              <div>Skipped: <span className="text-yellow-600">{log.recordsSkipped}</span></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.syncStatus === 'success' ? (
                              <Badge variant="default" className="bg-green-500">Success</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.responseTime}ms</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.triggeredBy}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(log.createdAt), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* UPI Transactions */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>UPI Transactions</CardTitle>
                  <CardDescription>All UPI transactions synced from external system</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportExcel}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    onClick={handleExportPdf}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Pagination info */}
              {upiPagination && (
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-600">
                    Showing {((upiPagination.page - 1) * upiPagination.limit) + 1} to {Math.min(upiPagination.page * upiPagination.limit, upiPagination.total)} of {upiPagination.total} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setUpiTransactionsPage(upiPagination.page - 1)}
                      disabled={!upiPagination.hasPrev}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {upiPagination.page} of {upiPagination.totalPages}
                    </span>
                    <Button
                      onClick={() => setUpiTransactionsPage(upiPagination.page + 1)}
                      disabled={!upiPagination.hasNext}
                      variant="outline"
                      size="sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Cups</TableHead>
                      <TableHead>UPI VPA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>External ID</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUpiTransactions ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Loading UPI transactions...
                        </TableCell>
                      </TableRow>
                    ) : upiTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No UPI transactions found. Perform initial sync to populate data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      upiTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono">{transaction.machineId}</TableCell>
                          <TableCell>₹{transaction.amount}</TableCell>
                          <TableCell>{transaction.cups}</TableCell>
                          <TableCell className="font-mono text-sm">{transaction.upiVpa || 'N/A'}</TableCell>
                          <TableCell>
                            {transaction.success ? (
                              <Badge variant="default" className="bg-green-500">Paid</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{transaction.externalTransactionId}</TableCell>
                          <TableCell>{format(new Date(transaction.createdAt), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Bottom pagination controls */}
              {upiPagination && upiPagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    onClick={() => setUpiTransactionsPage(1)}
                    disabled={upiPagination.page === 1}
                    variant="outline"
                    size="sm"
                  >
                    First
                  </Button>
                  <Button
                    onClick={() => setUpiTransactionsPage(upiPagination.page - 1)}
                    disabled={!upiPagination.hasPrev}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-4">
                    Page {upiPagination.page} of {upiPagination.totalPages}
                  </span>
                  <Button
                    onClick={() => setUpiTransactionsPage(upiPagination.page + 1)}
                    disabled={!upiPagination.hasNext}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setUpiTransactionsPage(upiPagination.totalPages)}
                    disabled={upiPagination.page === upiPagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Last
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DESFire Key Management</CardTitle>
              <CardDescription>Manage encryption keys for challenge-response authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center">
                  <Key className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <h4 className="font-medium">Key Rotation Schedule</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      DESFire keys should be rotated every 30 days for maximum security. 
                      This operation will generate new AES keys for all cards in a business unit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Business Unit Key Rotation</h4>
                {Array.from(new Set(machineStatuses.map(m => m.machine.businessUnitId).filter(Boolean))).map(businessUnitId => {
                  const businessUnit = machineStatuses.find(m => m.machine.businessUnitId === businessUnitId);
                  return (
                    <div key={businessUnitId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{businessUnit?.businessUnitName}</div>
                        <div className="text-sm text-gray-500">
                          Cards: {machineStatuses.filter(m => m.machine.businessUnitId === businessUnitId).reduce((sum, m) => sum + m.cardsCount, 0)}
                        </div>
                      </div>
                      <Button
                        onClick={() => rotateKeysMutation.mutate(businessUnitId!)}
                        disabled={rotateKeysMutation.isPending}
                        variant="outline"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Rotate Keys
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}