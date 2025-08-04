import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Removed Radix UI Select - using native HTML select instead
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  History, 
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
    queryKey: [endpoint, effectiveBusinessUnitId, currentPage, dateFilter, dateRange, showBusinessUnitFilter],
    queryFn: async () => {
      console.log('=== RECHARGE HISTORY FETCH DEBUG ===');
      console.log('showBusinessUnitFilter:', showBusinessUnitFilter);
      console.log('selectedBusinessUnit:', selectedBusinessUnit);
      console.log('effectiveBusinessUnitId:', effectiveBusinessUnitId);
      console.log('isAllBusinessUnits:', isAllBusinessUnits);
      console.log('endpoint:', endpoint);
      console.log('Business Unit ID (prop):', businessUnitId);
      console.log('Is Authenticated:', isAuthenticated);
      console.log('Available business units:', businessUnits);
      
      const queryParams = buildQueryParams();
      console.log('Query Params:', queryParams);
      
      const url = isAllBusinessUnits 
        ? `/api/recharge/user?${queryParams}`
        : `/api/recharge/business-unit/${effectiveBusinessUnitId}?${queryParams}`;
      
      console.log('Final URL:', url);
      
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
    console.log('Date filter changed to:', value);
    setDateFilter(value as any);
    setCurrentPage(1);
    if (value !== "custom") {
      setDateRange({ start: null, end: null });
    }
  };

  // Handle custom date range selection
  const handleDateRangeSelect = (range: any) => {
    console.log('Date range selected:', range);
    if (range?.from) {
      setDateRange({ 
        start: range.from, 
        end: range.to || null
      });
      setCurrentPage(1);
      
      // Update filter when we have both dates selected
      if (range.to) {
        console.log('Both dates selected, applying filter');
        setDateFilter("custom");
      }
    } else if (range === undefined) {
      // Clear selection
      setDateRange({ start: null, end: null });
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
              <div className="relative flex items-center">
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                <select 
                  value={selectedBusinessUnit} 
                  onChange={(e) => {
                    console.log('Business unit filter changed to:', e.target.value);
                    setSelectedBusinessUnit(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent text-sm"
                >
                  <option value="all">All Business Units</option>
                  {(businessUnits as any[]).map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div className="relative flex items-center">
              <Filter className="w-4 h-4 mr-2 text-gray-500" />
              <select 
                value={dateFilter} 
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-transparent text-sm"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === "custom" && (
              <div className="relative">
                <Button
                  variant="outline"
                  className={cn(
                    "w-60 justify-start text-left font-normal bg-white border border-gray-300 hover:border-gray-400",
                    !dateRange.start && "text-muted-foreground"
                  )}
                  onClick={() => {
                    console.log('Date picker button clicked, current showCalendar:', showCalendar);
                    setShowCalendar(!showCalendar);
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.start && dateRange.end ? (
                    `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
                  ) : dateRange.start ? (
                    `${format(dateRange.start, "MMM d, yyyy")} - Select end date`
                  ) : (
                    "Pick date range"
                  )}
                </Button>
                
                {/* Calendar shown directly below button when open */}
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 shadow-lg rounded-md p-3">
                    <Calendar
                      mode="range"
                      selected={{
                        from: dateRange.start || undefined,
                        to: dateRange.end || undefined
                      }}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                      className="rounded-md"
                    />
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateRange({ start: null, end: null });
                          setShowCalendar(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowCalendar(false)}
                        disabled={!dateRange.start || !dateRange.end}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Pagination Navigation at Top */}
        {!isLoading && recharges.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRecharges)} of {totalRecharges} recharges
            </div>
            <div className="flex items-center space-x-3">
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
                          {showBusinessUnitFilter 
                            ? (isAllBusinessUnits 
                                ? recharge.businessUnitName || 'Unknown Unit'
                                : (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnit)?.name || 'Unknown Unit')
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


          </div>
        )}
      </CardContent>


    </Card>
  );
}