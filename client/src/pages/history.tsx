import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { History, Plus, Coffee, Calendar, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [dispensingPage, setDispensingPage] = useState(1);
  const itemsPerPage = 20;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: [`/api/transactions?paginated=true&page=${transactionsPage}&limit=${itemsPerPage}`],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: dispensingData, isLoading: dispensingLoading } = useQuery({
    queryKey: [`/api/dispensing/history?paginated=true&page=${dispensingPage}&limit=${itemsPerPage}`],
    enabled: isAuthenticated,
    retry: false,
  });

  const transactions = transactionsData && 'transactions' in transactionsData ? transactionsData.transactions : [];
  const transactionsTotal = transactionsData && 'total' in transactionsData ? transactionsData.total : 0;
  const dispensingHistory = dispensingData && 'logs' in dispensingData ? dispensingData.logs : [];
  const dispensingTotal = dispensingData && 'total' in dispensingData ? dispensingData.total : 0;

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getTransactionIcon = (type: string) => {
    if (type === 'recharge' || type === 'credit') {
      return <Plus className="w-4 h-4 text-green-600" />;
    }
    return <Coffee className="w-4 h-4 text-orange-600" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'recharge' || type === 'credit') {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'recharge' || type === 'credit') {
      return '+';
    }
    return '-';
  };

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">Transaction History</h1>
          <p className="text-gray-600">View all your wallet recharges and tea dispensing activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* All Transactions */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5 text-tea-green" />
                <span>All Transactions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'recharge' || transaction.type === 'credit' ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{transaction.description}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(transaction.createdAt), 'MMM dd, yyyy • h:mm a')}
                          </div>
                          {transaction.method && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {transaction.method}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {getAmountPrefix(transaction.type)}₹{parseFloat(transaction.amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {transactionsTotal > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={transactionsPage}
                    totalPages={Math.ceil(transactionsTotal / itemsPerPage)}
                    totalItems={transactionsTotal}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setTransactionsPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tea Dispensing History */}
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coffee className="w-5 h-5 text-tea-green" />
                <span>Tea Dispensing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispensingLoading ? (
                <div className="text-center py-8">Loading dispensing history...</div>
              ) : !dispensingHistory || dispensingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tea dispensing history found
                </div>
              ) : (
                <div className="space-y-3">
                  {dispensingHistory.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Coffee className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">{log.teaType} Tea</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(log.createdAt), 'MMM dd, yyyy • h:mm a')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Machine: {log.machineId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          -₹{parseFloat(log.amount).toFixed(2)}
                        </div>
                        <Badge 
                          variant={log.success ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {log.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {dispensingTotal > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={dispensingPage}
                    totalPages={Math.ceil(dispensingTotal / itemsPerPage)}
                    totalItems={dispensingTotal}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setDispensingPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        <Card className="shadow-material mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-tea-green" />
              <span>Monthly Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-medium">Total</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ₹{transactions?.filter((t: any) => t.type === 'recharge').reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)?.toFixed(2) || '0.00'}
                </div>
                <div className="text-gray-600 text-sm">Recharged</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-orange-600 text-sm font-medium">Cups</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {dispensingHistory?.length || 0}
                </div>
                <div className="text-gray-600 text-sm">Dispensed</div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-red-600 text-sm font-medium">Spent</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ₹{dispensingHistory?.reduce((sum: number, log: any) => sum + parseFloat(log.amount), 0)?.toFixed(2) || '0.00'}
                </div>
                <div className="text-gray-600 text-sm">On Tea</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-blue-600 text-sm font-medium">Average</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ₹{dispensingHistory?.length ? (dispensingHistory.reduce((sum: number, log: any) => sum + parseFloat(log.amount), 0) / dispensingHistory.length).toFixed(2) : '0.00'}
                </div>
                <div className="text-gray-600 text-sm">Per Cup</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
