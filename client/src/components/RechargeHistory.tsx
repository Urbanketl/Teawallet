import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  History, 
  Download, 
  CalendarIcon, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  CreditCard
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface RechargeHistoryProps {
  businessUnitId: string;
  businessUnitName: string;
}

export default function RechargeHistory({ businessUnitId, businessUnitName }: RechargeHistoryProps) {
  const { isAuthenticated } = useAuth();
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [showCalendar, setShowCalendar] = useState(false);

  const limit = 10; // Show 10 recharges per page

  // Build query parameters for API call
  const buildQueryParams = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: limit.toString(),
    });

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateFilter === "week") {
      const now = new Date();
      startDate = format(startOfWeek(now), "yyyy-MM-dd");
      endDate = format(endOfWeek(now), "yyyy-MM-dd");
    } else if (dateFilter === "month") {
      const now = new Date();
      startDate = format(startOfMonth(now), "yyyy-MM-dd");
      endDate = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
      startDate = format(dateRange.start, "yyyy-MM-dd");
      endDate = format(dateRange.end, "yyyy-MM-dd");
    }

    if (startDate && endDate) {
      params.append("startDate", startDate);
      params.append("endDate", endDate);
    }

    return params.toString();
  };

  // Fetch recharge history
  const { data: rechargeData, isLoading, refetch } = useQuery({
    queryKey: ["/api/recharge/business-unit", businessUnitId, currentPage, dateFilter, dateRange],
    queryFn: async () => {
      console.log('=== RECHARGE HISTORY FETCH DEBUG ===');
      console.log('Business Unit ID:', businessUnitId);
      console.log('Is Authenticated:', isAuthenticated);
      
      const queryParams = buildQueryParams();
      console.log('Query Params:', queryParams);
      
      const response = await fetch(`/api/recharge/business-unit/${businessUnitId}?${queryParams}`, {
        credentials: 'include'
      });
      
      console.log('Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch recharge history: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && !!businessUnitId,
    staleTime: 0,
    gcTime: 0,
  });

  const recharges = rechargeData?.recharges || [];
  const totalRecharges = rechargeData?.total || 0;
  const totalPages = Math.ceil(totalRecharges / limit);

  // Handle date filter changes
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value as any);
    setCurrentPage(1);
    if (value !== "custom") {
      setDateRange({ start: null, end: null });
    }
  };

  // Handle custom date range selection
  const handleDateRangeSelect = (range: any) => {
    if (range?.from && range?.to) {
      setDateRange({ start: range.from, end: range.to });
      setDateFilter("custom");
      setCurrentPage(1);
      setShowCalendar(false);
    }
  };

  // Export recharge history
  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateFilter === "week") {
        const now = new Date();
        startDate = format(startOfWeek(now), "yyyy-MM-dd");
        endDate = format(endOfWeek(now), "yyyy-MM-dd");
      } else if (dateFilter === "month") {
        const now = new Date();
        startDate = format(startOfMonth(now), "yyyy-MM-dd");
        endDate = format(endOfMonth(now), "yyyy-MM-dd");
      } else if (dateFilter === "custom" && dateRange.start && dateRange.end) {
        startDate = format(dateRange.start, "yyyy-MM-dd");
        endDate = format(dateRange.end, "yyyy-MM-dd");
      }

      if (startDate && endDate) {
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
      }

      const response = await fetch(`/api/recharge/export/${businessUnitId}?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to export recharge history');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recharge-history-${businessUnitName}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format amount display
  const formatAmount = (amount: string, type: string) => {
    const prefix = type === 'recharge' || type === 'credit' ? '+' : '';
    return `${prefix}₹${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <Card className="shadow-material">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-tea-green" />
            <span>Recharge History</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range Picker */}
            {dateFilter === "custom" && (
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-60 justify-start text-left font-normal",
                      !dateRange.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.start && dateRange.end ? (
                      `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
                    ) : (
                      "Pick date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.start || undefined,
                      to: dateRange.end || undefined
                    }}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || totalRecharges === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading recharge history...
          </div>
        ) : recharges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No recharges found</p>
            <p className="text-sm">
              {dateFilter !== "all" 
                ? "Try adjusting your date filter to see more results"
                : "Start recharging your wallet to see transaction history here"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recharge List */}
            <div className="space-y-3">
              {recharges.map((recharge: any) => (
                <div
                  key={recharge.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-green-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {formatAmount(recharge.amount, recharge.type)}
                        </p>
                        <Badge variant={getStatusVariant(recharge.status || 'completed')}>
                          {recharge.status || 'Completed'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          {new Date(recharge.createdAt).toLocaleDateString('en-IN')} at{' '}
                          {new Date(recharge.createdAt).toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {recharge.userName && (
                          <span>by {recharge.userName}</span>
                        )}
                        {recharge.paymentId && (
                          <span className="font-mono text-xs">ID: {recharge.paymentId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500 capitalize">{recharge.type}</p>
                    {recharge.description && (
                      <p className="text-xs text-gray-400">{recharge.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRecharges)} of {totalRecharges} recharges
                </p>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}