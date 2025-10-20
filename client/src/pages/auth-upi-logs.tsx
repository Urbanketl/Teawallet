import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  Shield,
  Activity,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import Navigation from '@/components/Navigation';
import { Footer } from '@/components/layout/Footer';

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

export default function AuthUpiLogs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('auth-logs');
  const [authFilter, setAuthFilter] = useState('all');
  const [upiTransactionsPage, setUpiTransactionsPage] = useState(1);
  const [upiTransactionsLimit] = useState(20);

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

  const getAuthResultBadge = (result: string) => {
    return result === 'success' ? (
      <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>
    ) : (
      <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
    );
  };

  const getSyncStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>
    ) : (
      <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
    );
  };

  const filteredAuthLogs = authLogs.filter(log => 
    authFilter === 'all' || log.authResult === authFilter
  );

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Authentication & UPI Logs</h1>
              <p className="text-gray-600 dark:text-gray-400">Monitor RFID authentication and UPI transaction sync</p>
            </div>
            <Button
              onClick={() => {
                refetchAuthLogs();
                refetchUpiSync();
                refetchUpiSyncLogs();
                refetchUpiTransactions();
              }}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="auth-logs">Authentication Logs</TabsTrigger>
              <TabsTrigger value="upi-sync">UPI Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="auth-logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Challenge-Response Authentication Logs</CardTitle>
                      <CardDescription>Real-time RFID card authentication activity</CardDescription>
                    </div>
                    <Select value={authFilter} onValueChange={setAuthFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Machine</TableHead>
                          <TableHead>Business Unit</TableHead>
                          <TableHead>Card</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAuthLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                            <TableCell>{log.machineName}</TableCell>
                            <TableCell>{log.businessUnitName}</TableCell>
                            <TableCell className="font-mono text-sm">{log.cardNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                <Shield className="w-3 h-3 mr-1" />
                                {log.authMethod}
                              </Badge>
                            </TableCell>
                            <TableCell>{getAuthResultBadge(log.authResult)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upi-sync" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{upiSyncStatus?.stats.totalSyncs || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {upiSyncStatus?.stats.totalSyncs 
                        ? Math.round((upiSyncStatus.stats.successfulSyncs / upiSyncStatus.stats.totalSyncs) * 100)
                        : 0}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Transactions Processed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{upiSyncStatus?.stats.totalTransactionsProcessed || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total UPI Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{upiSyncStatus?.totalUpiTransactions || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>UPI Transaction Sync Logs</CardTitle>
                      <CardDescription>History of UPI transaction synchronization operations</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => upiDailySyncMutation.mutate()}
                        disabled={upiDailySyncMutation.isPending}
                        variant="outline"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        {upiDailySyncMutation.isPending ? 'Syncing...' : 'Run Daily Sync'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Triggered By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upiSyncLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                            <TableCell><Badge variant="outline">{log.syncType}</Badge></TableCell>
                            <TableCell>{getSyncStatusBadge(log.syncStatus)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Found: {log.recordsFound}</div>
                                <div className="text-green-600">Processed: {log.recordsProcessed}</div>
                                <div className="text-gray-500">Skipped: {log.recordsSkipped}</div>
                              </div>
                            </TableCell>
                            <TableCell>{log.responseTime}ms</TableCell>
                            <TableCell>{log.triggeredBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>UPI Transactions</CardTitle>
                      <CardDescription>All UPI transactions from MyOperator integration</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleExportExcel} variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                      <Button onClick={handleExportPdf} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Machine ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Cups</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>UPI ID</TableHead>
                          <TableHead>VPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upiTransactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell>{format(new Date(txn.createdAt), 'MMM d, yyyy HH:mm')}</TableCell>
                            <TableCell>{txn.machineId}</TableCell>
                            <TableCell>₹{parseFloat(txn.amount).toFixed(2)}</TableCell>
                            <TableCell>{txn.cups}</TableCell>
                            <TableCell>
                              {txn.success ? (
                                <Badge variant="default" className="bg-green-500">Success</Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{txn.upiPaymentId || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{txn.upiVpa || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {upiPagination && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((upiPagination.page - 1) * upiPagination.limit) + 1} to {Math.min(upiPagination.page * upiPagination.limit, upiPagination.total)} of {upiPagination.total} transactions
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setUpiTransactionsPage(prev => Math.max(1, prev - 1))}
                          disabled={!upiPagination.hasPrev}
                          variant="outline"
                          size="sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <div className="flex items-center px-4 text-sm">
                          Page {upiPagination.page} of {upiPagination.totalPages}
                        </div>
                        <Button
                          onClick={() => setUpiTransactionsPage(prev => prev + 1)}
                          disabled={!upiPagination.hasNext}
                          variant="outline"
                          size="sm"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
