import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { History, Plus, Coffee, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function TransactionHistory() {
  const { isAuthenticated } = useAuth();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    enabled: isAuthenticated,
    retry: false,
  });

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
    <Card className="shadow-material">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-tea-green" />
            <span>Recent Transactions</span>
          </CardTitle>
          <Link href="/history" className="text-tea-green hover:text-tea-dark font-medium text-sm flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((transaction: any) => (
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
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                    {getAmountPrefix(transaction.type)}₹{parseFloat(transaction.amount).toFixed(2)}
                  </div>
                  {transaction.method && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {transaction.method}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
