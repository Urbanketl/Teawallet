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
  businessUnitId?: string;
  businessUnitName?: string;
  showBusinessUnitFilter?: boolean;
}

export default function RechargeHistory({ businessUnitId, businessUnitName, showBusinessUnitFilter = false }: RechargeHistoryProps) {
  const { isAuthenticated } = useAuth();
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>(businessUnitId || "all");
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

  // Fetch user's business units for the filter
  const { data: businessUnits = [] } = useQuery({
    queryKey: ["/api/corporate/business-units"],
    enabled: isAuthenticated && showBusinessUnitFilter,
  });

  // Determine endpoint and query params based on filter mode
  const effectiveBusinessUnitId = showBusinessUnitFilter ? selectedBusinessUnit : businessUnitId;
  const isAllBusinessUnits = showBusinessUnitFilter && selectedBusinessUnit === "all";
  const endpoint = isAllBusinessUnits ? "/api/recharge/user" : "/api/recharge/business-unit";

  // Fetch recharge history
  const { data: rechargeData, isLoading, refetch } = useQuery({
    queryKey: [endpoint, effectiveBusinessUnitId, currentPage, dateFilter, dateRange],
    queryFn: async () => {
      console.log('=== RECHARGE HISTORY FETCH DEBUG ===');
      console.log('Business Unit ID:', businessUnitId);
      console.log('Is Authenticated:', isAuthenticated);
      
      const queryParams = buildQueryParams();
      console.log('Query Params:', queryParams);
      
      const url = isAllBusinessUnits 
        ? `/api/recharge/user?${queryParams}`
        : `/api/recharge/business-unit/${effectiveBusinessUnitId}?${queryParams}`;
      
      const response = await fetch(url, {
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
    enabled: isAuthenticated && (!!businessUnitId || showBusinessUnitFilter),
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
            {/* Business Unit Filter */}
            {showBusinessUnitFilter && (
              <div className="relative">
                <Select value={selectedBusinessUnit} onValueChange={(value) => {
                  setSelectedBusinessUnit(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-48 bg-white border border-gray-300 hover:border-gray-400">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Business Units" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="all">All Business Units</SelectItem>
                    {(businessUnits as any[]).map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Filter */}
            <div className="relative">
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-40 bg-white border border-gray-300 hover:border-gray-400">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === "custom" && (
              <div className="relative">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-60 justify-start text-left font-normal bg-white border border-gray-300 hover:border-gray-400",
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
                  <PopoverContent className="w-auto p-0 z-50 bg-white border border-gray-200 shadow-lg" align="start">
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
              </div>
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
            {/* Column Headers */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
              <div className="col-span-3">Amount & Status</div>
              <div className="col-span-3">Date & Time</div>
              <div className="col-span-2">Business Unit</div>
              <div className="col-span-2">Recharged By</div>
              <div className="col-span-2">Payment ID</div>
            </div>

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
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {formatAmount(recharge.amount, recharge.type)}
                        </p>
                        <Badge variant={getStatusVariant(recharge.status || 'completed')}>
                          {recharge.status || 'Completed'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-1">
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
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {showBusinessUnitFilter && isAllBusinessUnits 
                            ? recharge.businessUnitName || 'Unknown Unit'
                            : businessUnitName}
                        </span>
                        {recharge.razorpayPaymentId && (
                          <span className="font-mono">ID: {recharge.razorpayPaymentId}</span>
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