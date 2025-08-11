import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  IndianRupee, 
  Coffee, 
  TrendingUp, 
  Download, 
  Settings,
  UserCheck,
  Activity,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  UserPlus,
  UserMinus,
  Shield,
  Eye,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  Edit3,
  Settings2,
  MapPin,
  Power,
  PowerOff,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Building2,
  Edit,
  X,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";
import { BusinessUnitsTab } from "@/components/BusinessUnitsTab";
import { PseudoLogin } from "@/components/PseudoLogin";
import type { User } from "@shared/schema";

function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>("");
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [showExportConfirmation, setShowExportConfirmation] = useState(false);
  const [showPdfConfirmation, setShowPdfConfirmation] = useState(false);
  const [exportDetails, setExportDetails] = useState<any>(null);
  const [dateRangeMode, setDateRangeMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Generate month options for last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return options;
  }, []);

  // Fetch all business units for admin
  const { data: businessUnits = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units"],
  });

  // Fetch business unit summary when business unit(s) and dates are selected
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: [`/api/admin/business-units/summary`, selectionMode, selectedBusinessUnit, selectedBusinessUnits, dateRangeMode, selectedMonth, startDate, endDate],
    enabled: !!(
      ((selectionMode === 'single' && selectedBusinessUnit) || (selectionMode === 'multiple' && selectedBusinessUnits.length > 0)) &&
      ((dateRangeMode === 'single' && selectedMonth) || (dateRangeMode === 'range' && startDate && endDate))
    ),
    queryFn: async () => {
      let url = '/api/admin/business-units/summary?';
      
      // Add business unit IDs
      if (selectionMode === 'single') {
        url += `businessUnitIds=${selectedBusinessUnit}&`;
      } else {
        url += `businessUnitIds=${selectedBusinessUnits.join(',')}&`;
      }
      
      // Add date parameters
      if (dateRangeMode === 'single') {
        url += `month=${selectedMonth}`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    }
  });

  const handleExportConfirm = () => {
    setShowExportConfirmation(true);
  };

  const handlePdfConfirm = () => {
    setShowPdfConfirmation(true);
  };

  const handleExportCsv = async () => {
    setGenerating(true);
    setShowExportConfirmation(false);
    
    try {
      let url = `/api/admin/business-units/export?`;
      let fileName = '';
      
      // Add business unit IDs
      if (selectionMode === 'single') {
        url += `businessUnitIds=${selectedBusinessUnit}&`;
        const businessUnit = (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnit);
        fileName = businessUnit?.name || 'Report';
      } else {
        url += `businessUnitIds=${selectedBusinessUnits.join(',')}&`;
        fileName = selectedBusinessUnits.length > 1 ? 'Multiple_Units' : 
          (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnits[0])?.name || 'Report';
      }
      
      // Add date parameters
      if (dateRangeMode === 'single') {
        url += `month=${selectedMonth}`;
        const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        fileName += `_${monthLabel.replace(' ', '_')}_Report.csv`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
        fileName += `_${startDate}_to_${endDate}_Report.csv`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to generate CSV');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Success",
        description: "CSV report generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate CSV report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    setGenerating(true);
    setShowPdfConfirmation(false);
    
    try {
      let url = `/api/admin/business-units/invoice?`;
      let fileName = '';
      
      // Add business unit IDs
      if (selectionMode === 'single') {
        url += `businessUnitIds=${selectedBusinessUnit}&`;
        const businessUnit = (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnit);
        fileName = businessUnit?.name || 'Invoice';
      } else {
        url += `businessUnitIds=${selectedBusinessUnits.join(',')}&`;
        fileName = selectedBusinessUnits.length > 1 ? 'Multiple_Units' : 
          (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnits[0])?.name || 'Invoice';
      }
      
      // Add date parameters
      if (dateRangeMode === 'single') {
        url += `month=${selectedMonth}`;
        const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        fileName += `_${monthLabel.replace(' ', '_')}_Invoice.pdf`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
        fileName += `_${startDate}_to_${endDate}_Invoice.pdf`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Success",
        description: "PDF invoice generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Business Unit Reports</h3>
        <p className="text-sm text-gray-600 mt-1">
          Generate reports for any business unit in Excel or PDF format - single month or custom date range
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Business Unit Selection</Label>
              <div className="mt-1 space-y-3">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="single"
                      checked={selectionMode === 'single'}
                      onChange={(e) => {
                        setSelectionMode('single');
                        setSelectedBusinessUnits([]);
                      }}
                      className="mr-2"
                    />
                    Single Unit
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="multiple"
                      checked={selectionMode === 'multiple'}
                      onChange={(e) => {
                        setSelectionMode('multiple');
                        setSelectedBusinessUnit('');
                      }}
                      className="mr-2"
                    />
                    Multiple Units
                  </label>
                </div>
                
                {selectionMode === 'single' ? (
                  <select
                    id="business-unit"
                    value={selectedBusinessUnit}
                    onChange={(e) => setSelectedBusinessUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a business unit</option>
                    {(businessUnits as any[]).map((unit: any) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    {/* Select All Option */}
                    {(businessUnits as any[]).length > 0 && (
                      <div className="border-b border-gray-200 pb-2 mb-2">
                        <label className="flex items-center p-1 hover:bg-gray-50 font-medium">
                          <input
                            type="checkbox"
                            checked={selectedBusinessUnits.length === (businessUnits as any[]).length}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = selectedBusinessUnits.length > 0 && selectedBusinessUnits.length < (businessUnits as any[]).length;
                              }
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Select all business units
                                setSelectedBusinessUnits((businessUnits as any[]).map((unit: any) => unit.id));
                              } else {
                                // Deselect all business units
                                setSelectedBusinessUnits([]);
                              }
                            }}
                            className="mr-2"
                          />
                          {selectedBusinessUnits.length === (businessUnits as any[]).length 
                            ? `All Units Selected (${(businessUnits as any[]).length})` 
                            : selectedBusinessUnits.length > 0 
                            ? `Select All (${selectedBusinessUnits.length}/${(businessUnits as any[]).length} selected)`
                            : `Select All (${(businessUnits as any[]).length} units)`
                          }
                        </label>
                      </div>
                    )}
                    
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {(businessUnits as any[]).length === 0 ? (
                        <p className="text-gray-500 text-sm">No business units available</p>
                      ) : (
                        (businessUnits as any[]).map((unit: any) => (
                          <label key={unit.id} className="flex items-center p-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedBusinessUnits.includes(unit.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBusinessUnits([...selectedBusinessUnits, unit.id]);
                                } else {
                                  setSelectedBusinessUnits(selectedBusinessUnits.filter(id => id !== unit.id));
                                }
                              }}
                              className="mr-2"
                            />
                            {unit.name} ({unit.code})
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Date Selection</Label>
              <div className="mt-1 space-y-3">
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="single"
                      checked={dateRangeMode === 'single'}
                      onChange={(e) => setDateRangeMode('single')}
                      className="mr-2"
                    />
                    Single Month
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="range"
                      checked={dateRangeMode === 'range'}
                      onChange={(e) => setDateRangeMode('range')}
                      className="mr-2"
                    />
                    Date Range
                  </label>
                </div>
                
                {dateRangeMode === 'single' ? (
                  <select
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a month</option>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                      <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-sm">End Date</Label>
                      <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {summaryData && ((selectionMode === 'single' && selectedBusinessUnit) || (selectionMode === 'multiple' && selectedBusinessUnits.length > 0)) && ((dateRangeMode === 'single' && selectedMonth) || (dateRangeMode === 'range' && startDate && endDate)) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Report Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Transactions</p>
                  <p className="font-semibold">{summaryData.totalTransactions || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <p className="font-semibold">₹{parseFloat(summaryData.totalAmount || '0').toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cups Dispensed</p>
                  <p className="font-semibold">{summaryData.totalTransactions || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Active Machines</p>
                  <p className="font-semibold">{summaryData.uniqueMachines || 0}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              onClick={handleExportConfirm}
              disabled={((selectionMode === 'single' && !selectedBusinessUnit) || (selectionMode === 'multiple' && selectedBusinessUnits.length === 0)) || (dateRangeMode === 'single' ? !selectedMonth : (!startDate || !endDate)) || generating}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
            
            <Button
              onClick={handlePdfConfirm}
              disabled={((selectionMode === 'single' && !selectedBusinessUnit) || (selectionMode === 'multiple' && selectedBusinessUnits.length === 0)) || (dateRangeMode === 'single' ? !selectedMonth : (!startDate || !endDate)) || generating}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate PDF Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Excel Export Confirmation Dialog */}
      {showExportConfirmation && summaryData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Excel Export</h3>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 mb-2">You are about to export the following data:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Business Unit{selectionMode === 'multiple' && selectedBusinessUnits.length > 1 ? 's' : ''}:</span> {
                  selectionMode === 'single' 
                    ? (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnit)?.name
                    : selectedBusinessUnits.map(id => (businessUnits as any[]).find((unit: any) => unit.id === id)?.name).join(', ')
                }</p>
                <p><span className="font-medium">Period:</span> {dateRangeMode === 'single' ? monthOptions.find(m => m.value === selectedMonth)?.label : `${startDate} to ${endDate}`}</p>
                <p><span className="font-medium">Transactions:</span> {summaryData.totalTransactions || 0}</p>
                <p><span className="font-medium">Total Amount:</span> ₹{parseFloat(summaryData.totalAmount || '0').toFixed(2)}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-800 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                This will generate a detailed Excel report with all transactions for the selected period. Please avoid generating the same report multiple times.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowExportConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={handleExportCsv} className="bg-green-600 hover:bg-green-700">
                Confirm Export
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Invoice Confirmation Dialog */}
      {showPdfConfirmation && summaryData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm PDF Invoice Generation</h3>
            
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 mb-2">You are about to generate an invoice with:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Business Unit{selectionMode === 'multiple' && selectedBusinessUnits.length > 1 ? 's' : ''}:</span> {
                  selectionMode === 'single' 
                    ? (businessUnits as any[]).find((unit: any) => unit.id === selectedBusinessUnit)?.name
                    : selectedBusinessUnits.map(id => (businessUnits as any[]).find((unit: any) => unit.id === id)?.name).join(', ')
                }</p>
                <p><span className="font-medium">Period:</span> {dateRangeMode === 'single' ? monthOptions.find(m => m.value === selectedMonth)?.label : `${startDate} to ${endDate}`}</p>
                <p><span className="font-medium">Cups Dispensed:</span> {summaryData.totalTransactions || 0}</p>
                <p><span className="font-medium">Total Amount:</span> ₹{parseFloat(summaryData.totalAmount || '0').toFixed(2)}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-800 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                This will generate an official invoice PDF. Ensure all details are correct before proceeding. Duplicate invoices should be avoided.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPdfConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={handleExportPdf} className="bg-red-600 hover:bg-red-700">
                Generate Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const typedUser = user as User;
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pseudoUserId, setPseudoUserId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("overview");
  const [settings, setSettings] = useState({
    teaPrice: "5.00",
    maintenanceMode: false,
    autoRecharge: true,
    maxWalletBalance: "5000.00",
    lowBalanceThreshold: "50.00",
    systemName: "UrbanKetl Tea System",
    criticalBalanceThreshold: "100.00",
    lowBalanceAlertThreshold: "500.00"
  });

  // Balance monitoring states
  const [balanceFilter, setBalanceFilter] = useState<string>('all'); // all, low, critical, empty
  const [sortBalance, setSortBalance] = useState<'asc' | 'desc'>('asc');
  
  // Dynamic thresholds from database settings
  const criticalThreshold = parseFloat(settings.criticalBalanceThreshold);
  const lowBalanceThreshold = parseFloat(settings.lowBalanceAlertThreshold);

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsStatus, setTicketsStatus] = useState("all");
  const [rfidCardsPage, setRfidCardsPage] = useState(1);
  const usersPerPage = 50;
  const ticketsPerPage = 20;
  const rfidCardsPerPage = 20;

  // Load system settings from database
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  // Paginated users query
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", { paginated: true, page: usersPage, limit: usersPerPage, search: usersSearch }],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  // Paginated support tickets query
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: [`/api/admin/support/tickets?paginated=true&page=${ticketsPage}&limit=${ticketsPerPage}${ticketsStatus ? `&status=${ticketsStatus}` : ''}`],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  // Update settings state when database values are loaded
  useEffect(() => {
    if (systemSettings && Array.isArray(systemSettings)) {
      const maxWalletSetting = systemSettings.find(s => s.key === 'max_wallet_balance');
      const criticalBalanceSetting = systemSettings.find(s => s.key === 'critical_balance_threshold');
      const lowBalanceAlertSetting = systemSettings.find(s => s.key === 'low_balance_threshold');
      
      setSettings(prev => ({
        ...prev,
        ...(maxWalletSetting && { maxWalletBalance: maxWalletSetting.value }),
        ...(criticalBalanceSetting && { criticalBalanceThreshold: criticalBalanceSetting.value }),
        ...(lowBalanceAlertSetting && { lowBalanceAlertThreshold: lowBalanceAlertSetting.value })
      }));
    }
  }, [systemSettings]);

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

  // Check if user is admin
  useEffect(() => {
    if (typedUser && !typedUser.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [typedUser, toast]);

  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  // Business unit balance monitoring query
  const { data: businessUnitBalances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ["/api/admin/business-unit-balances"],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  const { data: allUsers, isLoading: allUsersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
  });

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  const queryClient = useQueryClient();

  // State declarations first
  const [statusUpdateDialogs, setStatusUpdateDialogs] = useState<{ [key: number]: boolean }>({});
  const [statusUpdateData, setStatusUpdateData] = useState<{ [key: number]: { status: string; comment: string } }>({});
  const [historyDialogs, setHistoryDialogs] = useState<{ [key: number]: boolean }>({});
  const [ticketHistories, setTicketHistories] = useState<{ [key: number]: any[] }>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // Build query string dynamically in useMemo to ensure it updates with state changes
  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      paginated: 'true',
      page: ticketsPage.toString(),
      limit: ticketsPerPage.toString(),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(dateFilter !== 'all' && { dateFilter }),
      ...(customDateRange.start && dateFilter === 'custom' && { startDate: customDateRange.start }),
      ...(customDateRange.end && dateFilter === 'custom' && { endDate: customDateRange.end }),
      ...(userFilter !== 'all' && { userId: userFilter }),
      sortBy,
      sortOrder,
    });
    return params.toString();
  }, [ticketsPage, ticketsPerPage, statusFilter, dateFilter, customDateRange, userFilter, sortBy, sortOrder]);

  const { data: filteredTicketsData, isLoading: allTicketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['/api/admin/support/tickets', {
      page: ticketsPage,
      limit: ticketsPerPage,
      status: statusFilter,
      dateFilter,
      startDate: customDateRange.start,
      endDate: customDateRange.end,
      userId: userFilter,
      sortBy,
      sortOrder
    }],
    queryFn: async () => {
      const url = `/api/admin/support/tickets?${queryString}`;
      console.log('Fetching support tickets with URL:', url);
      console.log('Current filter states:', { statusFilter, dateFilter, userFilter, sortBy, sortOrder });
      console.log('Query string:', queryString);
      
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Received tickets data:', data);
      return data;
    },
    enabled: Boolean(isAuthenticated && typedUser?.isAdmin),
    retry: false,
    refetchInterval: 5000,
  });

  // Extract users from tickets for the user filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Map();
    if (filteredTicketsData && (filteredTicketsData as any).allTickets) {
      (filteredTicketsData as any).allTickets.forEach((ticket: any) => {
        if (ticket.user) {
          users.set(ticket.userId, {
            id: ticket.userId,
            name: `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || ticket.user.email,
            email: ticket.user.email
          });
        }
      });
    }
    return Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTicketsData]);

  // Debug logging
  console.log('Support tickets data:', filteredTicketsData);
  console.log('Support tickets loading:', allTicketsLoading);
  console.log('Support tickets type:', typeof filteredTicketsData);
  console.log('Support tickets is array:', Array.isArray(filteredTicketsData));

  const { data: ticketMessages = [], refetch: refetchTicketMessages } = useQuery({
    queryKey: [`/api/support/tickets/${selectedTicketId}/messages`],
    enabled: !!selectedTicketId,
    refetchInterval: selectedTicketId ? 3000 : false,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, status, assignedTo, comment }: { ticketId: number; status?: string; assignedTo?: string; comment?: string }) => {
      return apiRequest('PATCH', `/api/admin/support/tickets/${ticketId}`, { status, assignedTo, comment });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ticket updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setStatusUpdateDialogs({});
      setStatusUpdateData({});
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update ticket",
        variant: "destructive" 
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      if (!selectedTicketId) {
        throw new Error('No ticket selected');
      }
      return apiRequest('POST', `/api/support/tickets/${selectedTicketId}/messages`, {
        ...messageData,
        isFromSupport: true
      });
    },
    onSuccess: () => {
      refetchTicketMessages();
      refetchTickets();
      setNewMessage('');
      toast({ title: "Success", description: "Message sent successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || 'Failed to send message',
        variant: "destructive" 
      });
    },
  });



  const handleStatusChange = (ticketId: number, newStatus: string) => {
    setStatusUpdateData({
      ...statusUpdateData,
      [ticketId]: { status: newStatus, comment: '' }
    });
    setStatusUpdateDialogs({
      ...statusUpdateDialogs,
      [ticketId]: true
    });
  };

  const confirmStatusUpdate = (ticketId: number) => {
    const data = statusUpdateData[ticketId];
    if (!data?.comment.trim()) {
      toast({
        title: "Error",
        description: "Comment is required when changing ticket status",
        variant: "destructive"
      });
      return;
    }
    
    updateTicketMutation.mutate({
      ticketId,
      status: data.status,
      comment: data.comment
    });
  };

  const fetchTicketHistory = async (ticketId: number) => {
    try {
      console.log('Fetching history for ticket ID:', ticketId);
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/history`, {
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        const history = await response.json();
        console.log('Received history data:', history);
        setTicketHistories(prev => ({ ...prev, [ticketId]: history }));
        setHistoryDialogs(prev => ({ ...prev, [ticketId]: true }));
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        toast({
          title: "Error",
          description: "Failed to fetch ticket history",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch ticket history",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setTicketsPage(1);
  }, [statusFilter, dateFilter, userFilter, sortBy, sortOrder]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-warm flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !typedUser || !typedUser.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-warm">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-inter font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">System overview and management</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => {
                console.log("Settings button clicked", settingsOpen);
                setSettingsOpen(true);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>

            {/* Settings Modal */}
            {settingsOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">System Settings</h2>
                    <p className="text-gray-600 text-sm">Configure system-wide settings for the UrbanKetl tea dispensing system.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="systemName">System Name</Label>
                      <Input
                        id="systemName"
                        value={settings.systemName}
                        onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="teaPrice">Tea Price (₹)</Label>
                      <Input
                        id="teaPrice"
                        type="number"
                        step="0.01"
                        value={settings.teaPrice}
                        onChange={(e) => setSettings({...settings, teaPrice: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxBalance">Max Wallet (₹)</Label>
                      <Input
                        id="maxBalance"
                        type="number"
                        step="0.01"
                        value={settings.maxWalletBalance}
                        onChange={(e) => setSettings({...settings, maxWalletBalance: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="lowBalance">Low Balance Alert (₹)</Label>
                      <Input
                        id="lowBalance"
                        type="number"
                        step="0.01"
                        value={settings.lowBalanceThreshold}
                        onChange={(e) => setSettings({...settings, lowBalanceThreshold: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="criticalBalance">Critical Balance Threshold (₹)</Label>
                      <Input
                        id="criticalBalance"
                        type="number"
                        step="0.01"
                        value={settings.criticalBalanceThreshold}
                        onChange={(e) => setSettings({...settings, criticalBalanceThreshold: e.target.value})}
                        className="w-full"
                        placeholder="100.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Units with balance at or below this amount will be marked as critical</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="lowBalanceAlert">Low Balance Warning Threshold (₹)</Label>
                      <Input
                        id="lowBalanceAlert"
                        type="number"
                        step="0.01"
                        value={settings.lowBalanceAlertThreshold}
                        onChange={(e) => setSettings({...settings, lowBalanceAlertThreshold: e.target.value})}
                        className="w-full"
                        placeholder="500.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Units with balance below this amount (but above critical) will be marked as low balance</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance">Maintenance Mode</Label>
                      <Switch
                        id="maintenance"
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoRecharge">Auto Recharge</Label>
                      <Switch
                        id="autoRecharge" 
                        checked={settings.autoRecharge}
                        onCheckedChange={(checked) => setSettings({...settings, autoRecharge: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          console.log('Saving all settings...');
                          
                          // Save all three balance-related settings
                          const settingsToSave = [
                            { key: 'max_wallet_balance', value: parseFloat(settings.maxWalletBalance).toFixed(2) },
                            { key: 'critical_balance_threshold', value: parseFloat(settings.criticalBalanceThreshold).toFixed(2) },
                            { key: 'low_balance_threshold', value: parseFloat(settings.lowBalanceAlertThreshold).toFixed(2) }
                          ];

                          // Save each setting
                          for (const setting of settingsToSave) {
                            const response = await fetch('/api/admin/settings', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(setting),
                              credentials: 'include'
                            });

                            if (!response.ok) {
                              const errorData = await response.text();
                              console.error(`Failed to save ${setting.key}:`, errorData);
                              throw new Error(`Failed to update ${setting.key}: ${response.status}`);
                            }
                          }

                          console.log('All settings saved successfully, refreshing cache...');

                          // Force refresh all settings-related queries
                          await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
                          await queryClient.refetchQueries({ queryKey: ["/api/admin/settings"] });

                          console.log('Cache refreshed, showing success message...');

                          toast({
                            title: "Settings Updated Successfully",
                            description: `All balance thresholds updated: Max Wallet ₹${settings.maxWalletBalance}, Critical ₹${settings.criticalBalanceThreshold}, Low Balance ₹${settings.lowBalanceAlertThreshold}`,
                          });
                          
                          setSettingsOpen(false);
                          
                        } catch (error) {
                          console.error('Settings save error:', error);
                          toast({
                            title: "Update Failed",
                            description: `Failed to save system settings: ${(error as any).message}`,
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-tea-green hover:bg-tea-dark"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Platform Admin Navigation (moved to top) */}
        {/* Mobile Navigation Selector (visible on small screens) */}
        <div className="sm:hidden mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800">Platform Admin</h3>
              </div>

              {/* Native HTML Select for better mobile compatibility */}
              <select 
                value={currentTab}
                onChange={(e) => setCurrentTab(e.target.value)}
                className="w-full bg-white border border-orange-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="overview">📊 Overview Dashboard</option>
                <option value="users">👥 User Management</option>
                <option value="business-units">🏢 Business Units</option>
                <option value="machines">☕ Tea Machines</option>
                <option value="machine-mgmt">🔧 Machine Admin</option>
                <option value="rfid">💳 RFID Cards</option>
                <option value="support">📞 Support Tickets</option>
                <option value="reports">📊 Reports & Export</option>
                <option value="faq">❓ FAQ Management</option>
                <option value="pseudo-login">🔓 Test Login</option>
                <option value="settings">⚙️ System Settings</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Tabs Interface (visible on larger screens) */}
        <div className="hidden sm:block mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="flex overflow-x-auto">
                <button 
                  onClick={() => setCurrentTab("overview")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "overview" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  📊 Overview
                </button>
                <button 
                  onClick={() => setCurrentTab("users")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "users" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  👥 Users
                </button>
                <button 
                  onClick={() => setCurrentTab("business-units")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "business-units" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  🏢 Business Units
                </button>
                <button 
                  onClick={() => setCurrentTab("machines")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "machines" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  ☕ Machines
                </button>
                <button 
                  onClick={() => setCurrentTab("machine-mgmt")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "machine-mgmt" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  🔧 Machine Mgmt
                </button>
                <button 
                  onClick={() => setCurrentTab("rfid")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "rfid" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  💳 RFID Cards
                </button>
                <button 
                  onClick={() => setCurrentTab("support")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "support" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  📞 Support
                </button>
                <button 
                  onClick={() => setCurrentTab("faq")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "faq" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  ❓ FAQ
                </button>
                <button 
                  onClick={() => setCurrentTab("reports")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "reports" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  📊 Reports
                </button>
                <button 
                  onClick={() => setCurrentTab("pseudo-login")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "pseudo-login" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  🔓 Test
                </button>
                <button 
                  onClick={() => setCurrentTab("settings")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === "settings" 
                      ? "border-orange-500 text-orange-600 bg-orange-50" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  ⚙️ Settings
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-blue-600 text-sm font-medium">+12%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : (adminStats as any)?.totalUsers || 0}
              </div>
              <div className="text-gray-600">Total Business Units</div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-600 text-sm font-medium">+8%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{statsLoading ? "..." : parseFloat((adminStats as any)?.totalRevenue || "0").toFixed(2)}
              </div>
              <div className="text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>

          {/* Active Machines */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
                <span className="text-purple-600 text-sm font-medium">98%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : `${(adminStats as any)?.activeMachines || 0}/${(machines as any[])?.length || 0}`}
              </div>
              <div className="text-gray-600">Active Machines</div>
            </CardContent>
          </Card>

          {/* Daily Dispensing */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 shadow-material">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-orange-600 text-sm font-medium">+15%</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? "..." : (adminStats as any)?.dailyDispensing || 0}
              </div>
              <div className="text-gray-600">Cups Today</div>
            </CardContent>
          </Card>
        </div>



        {/* Tab Content Area */}
        <div className="space-y-6">



          {currentTab === "overview" && (
            <div className="space-y-6">
              {/* Balance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <Badge className="bg-red-500 text-white text-xs">Critical</Badge>
                    </div>
                    <div className="text-2xl font-bold text-red-800 mb-1">
                      {balancesLoading ? "..." : (businessUnitBalances as any[]).filter((bu: any) => bu.balance <= criticalThreshold).length}
                    </div>
                    <div className="text-red-700 text-sm">Units ≤ ₹{criticalThreshold}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Wallet className="w-5 h-5 text-yellow-600" />
                      <Badge className="bg-yellow-500 text-white text-xs">Low</Badge>
                    </div>
                    <div className="text-2xl font-bold text-yellow-800 mb-1">
                      {balancesLoading ? "..." : (businessUnitBalances as any[]).filter((bu: any) => bu.balance > criticalThreshold && bu.balance <= lowBalanceThreshold).length}
                    </div>
                    <div className="text-yellow-700 text-sm">Units ≤ ₹{lowBalanceThreshold}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <Badge className="bg-green-500 text-white text-xs">Healthy</Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-800 mb-1">
                      {balancesLoading ? "..." : (businessUnitBalances as any[]).filter((bu: any) => bu.balance > lowBalanceThreshold).length}
                    </div>
                    <div className="text-green-700 text-sm">Units {'>'} ₹{lowBalanceThreshold}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <Badge className="bg-blue-500 text-white text-xs">Total</Badge>
                    </div>
                    <div className="text-2xl font-bold text-blue-800 mb-1">
                      {balancesLoading ? "..." : (businessUnitBalances as any[]).length}
                    </div>
                    <div className="text-blue-700 text-sm">Total Units</div>
                  </CardContent>
                </Card>
              </div>

              {/* Balance Monitoring Controls */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-orange-600" />
                        Business Unit Balance Monitor
                      </CardTitle>
                      <CardDescription>Track and manage low balance alerts across all business units</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Refresh balance data
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/business-unit-balances"] });
                        }}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-2 block">Balance Filter</Label>
                      <select
                        value={balanceFilter}
                        onChange={(e) => setBalanceFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="all">All Business Units</option>
                        <option value="critical">Critical (≤ ₹{criticalThreshold})</option>
                        <option value="low">Low Balance (≤ ₹{lowBalanceThreshold})</option>
                        <option value="healthy">Healthy ({'>'} ₹{lowBalanceThreshold})</option>
                        <option value="empty">Empty (₹0)</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-48">
                      <Label className="text-sm font-medium mb-2 block">Custom Threshold (₹)</Label>
                      <Input
                        type="number"
                        value={lowBalanceThreshold}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            lowBalanceAlertThreshold: newValue
                          }));
                        }}
                        placeholder="500"
                        className="w-full"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <Label className="text-sm font-medium mb-2 block">Sort</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortBalance(sortBalance === 'asc' ? 'desc' : 'asc')}
                        className="w-full justify-between"
                      >
                        Balance
                        {sortBalance === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Business Units Table */}
                  {balancesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading balance data...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Business Unit</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">Balance</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">Last Activity</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let filteredUnits = [...(businessUnitBalances as any[])];
                            
                            // Apply balance filter
                            switch (balanceFilter) {
                              case 'critical':
                                filteredUnits = filteredUnits.filter(bu => bu.balance <= criticalThreshold);
                                break;
                              case 'low':
                                filteredUnits = filteredUnits.filter(bu => bu.balance > criticalThreshold && bu.balance <= lowBalanceThreshold);
                                break;
                              case 'healthy':
                                filteredUnits = filteredUnits.filter(bu => bu.balance > lowBalanceThreshold);
                                break;
                              case 'empty':
                                filteredUnits = filteredUnits.filter(bu => bu.balance === 0);
                                break;
                            }
                            
                            // Apply sorting
                            filteredUnits.sort((a, b) => {
                              return sortBalance === 'asc' ? a.balance - b.balance : b.balance - a.balance;
                            });
                            
                            return filteredUnits.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">
                                  No business units match the current filter
                                </td>
                              </tr>
                            ) : filteredUnits.map((unit: any) => {
                              const getStatusBadge = (balance: number) => {
                                if (balance <= criticalThreshold) return <Badge className="bg-red-500 text-white">Critical</Badge>;
                                if (balance <= lowBalanceThreshold) return <Badge className="bg-yellow-500 text-white">Low</Badge>;
                                return <Badge className="bg-green-500 text-white">Healthy</Badge>;
                              };
                              
                              const getStatusIcon = (balance: number) => {
                                if (balance <= criticalThreshold) return <AlertCircle className="w-4 h-4 text-red-500" />;
                                if (balance <= lowBalanceThreshold) return <Clock className="w-4 h-4 text-yellow-500" />;
                                return <CheckCircle className="w-4 h-4 text-green-500" />;
                              };
                              
                              return (
                                <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(unit.balance)}
                                      {getStatusBadge(unit.balance)}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div>
                                      <div className="font-medium text-gray-900">{unit.name}</div>
                                      <div className="text-sm text-gray-500">{unit.code || unit.id}</div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className={`font-bold text-lg ${
                                      unit.balance <= criticalThreshold ? 'text-red-600' :
                                      unit.balance <= lowBalanceThreshold ? 'text-yellow-600' :
                                      'text-green-600'
                                    }`}>
                                      ₹{unit.balance?.toFixed(2) || '0.00'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center text-sm text-gray-600">
                                    {unit.lastActivity ? format(new Date(unit.lastActivity), 'MMM d, HH:mm') : 'No activity'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      {unit.balance <= lowBalanceThreshold && (
                                        <>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => {
                                              // Send reminder action
                                              toast({
                                                title: "Reminder Sent",
                                                description: `Low balance reminder sent to ${unit.name}`,
                                              });
                                            }}
                                          >
                                            <MessageCircle className="w-3 h-3 mr-1" />
                                            Remind
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            className="bg-orange-600 hover:bg-orange-700"
                                            onClick={() => {
                                              // Quick action - could navigate to recharge page
                                              window.open(`/corporate?businessUnit=${unit.id}#wallet`, '_blank');
                                            }}
                                          >
                                            <CreditCard className="w-3 h-3 mr-1" />
                                            Recharge
                                          </Button>
                                        </>
                                      )}
                                      {unit.balance > lowBalanceThreshold && (
                                        <Button size="sm" variant="ghost" disabled>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Healthy
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentTab === "users" && <UserManagement />}

          {currentTab === "rfid" && (
            <RfidManagement 
              rfidCardsPage={rfidCardsPage}
              setRfidCardsPage={setRfidCardsPage}
              rfidCardsPerPage={rfidCardsPerPage}
            />
          )}

          {currentTab === "machines" && <MachineManagement />}

          {currentTab === "machine-mgmt" && <MachineAdministration />}

          {currentTab === "business-units" && <BusinessUnitsTab />}

          {currentTab === "reports" && <AdminReports />}

          {currentTab === "pseudo-login" && (
            <PseudoLogin onLogin={(userId) => {
              setPseudoUserId(userId);
              // Navigate to a business unit user view
              window.open(`${window.location.origin}/corporate?pseudo=${userId}`, '_blank');
            }} />
          )}

          {currentTab === "support" && (
            <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
              <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                {(filteredTicketsData as any)?.tickets?.length || 0} / {(filteredTicketsData as any)?.total || 0} Tickets (Page {ticketsPage})
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select 
                value={dateFilter} 
                onChange={(e) => {
                  console.log('Date filter changed to:', e.target.value);
                  setDateFilter(e.target.value);
                  setTicketsPage(1); // Reset to first page when filter changes
                }}
                className="h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              <select 
                value={statusFilter} 
                onChange={(e) => {
                  console.log('Status filter changed to:', e.target.value);
                  setStatusFilter(e.target.value);
                  setTicketsPage(1); // Reset to first page when filter changes
                }}
                className="h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select 
                value={userFilter} 
                onChange={(e) => {
                  console.log('User filter changed to:', e.target.value);
                  setUserFilter(e.target.value);
                  setTicketsPage(1); // Reset to first page when filter changes
                }}
                className="h-10 w-56 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              
              <select 
                value={sortBy} 
                onChange={(e) => {
                  console.log('Sort by changed to:', e.target.value);
                  setSortBy(e.target.value);
                }}
                className="h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="createdAt">Sort by Date</option>
                <option value="status">Sort by Status</option>
                <option value="priority">Sort by Priority</option>
                <option value="userId">Sort by User</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                  console.log('Sort order changed to:', newOrder);
                  setSortOrder(newOrder);
                }}
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </Button>
            </div>

            {dateFilter === 'custom' && (
              <Card className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </Card>
            )}

            <div className="grid gap-4">
              {allTicketsLoading ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    Loading support tickets...
                  </CardContent>
                </Card>
              ) : !(filteredTicketsData as any)?.tickets || (filteredTicketsData as any).tickets.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No support tickets found for the selected date range</p>
                  </CardContent>
                </Card>
              ) : (
                ((filteredTicketsData as any)?.tickets || []).map((ticket: any) => {
                  console.log('Rendering ticket:', ticket.id, 'with status:', ticket.status);
                  return (
                    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                          <Badge className={`${getStatusColor(ticket.status)} border-0`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(ticket.status)}
                              <span className="capitalize">{ticket.status}</span>
                            </div>
                          </Badge>
                          <Badge className={`${getPriorityColor(ticket.priority)} border-0`}>
                            {ticket.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>From: {ticket.user?.firstName} {ticket.user?.lastName}</span>
                          <span>•</span>
                          <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy h:mm a')}</span>
                          <span>•</span>
                          <span>#{ticket.id}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="relative">
                          <select
                            value={ticket.status}
                            onChange={(e) => {
                              console.log("Status change triggered:", ticket.id, "->", e.target.value);
                              handleStatusChange(ticket.id, e.target.value);
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>

                        {/* Status Update Modal */}
                        {statusUpdateDialogs[ticket.id] && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                              <div className="mb-4">
                                <h2 className="text-xl font-semibold">Update Ticket Status</h2>
                                <p className="text-gray-600 text-sm">Please provide a comment explaining the status change.</p>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <Label>Status Change</Label>
                                  <p className="text-sm text-gray-600">
                                    {ticket.status} → {statusUpdateData[ticket.id]?.status}
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor={`comment-${ticket.id}`}>Comment *</Label>
                                  <Textarea
                                    id={`comment-${ticket.id}`}
                                    placeholder="Enter reason for status change..."
                                    value={statusUpdateData[ticket.id]?.comment || ''}
                                    onChange={(e) => setStatusUpdateData({
                                      ...statusUpdateData,
                                      [ticket.id]: {
                                        ...statusUpdateData[ticket.id],
                                        comment: e.target.value
                                      }
                                    })}
                                    rows={3}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end space-x-2 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={() => setStatusUpdateDialogs({
                                    ...statusUpdateDialogs,
                                    [ticket.id]: false
                                  })}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => confirmStatusUpdate(ticket.id)}
                                  disabled={updateTicketMutation.isPending}
                                  className="bg-tea-green hover:bg-tea-dark"
                                >
                                  {updateTicketMutation.isPending ? "Updating..." : "Update Status"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(ticket.id, 'closed')}
                          disabled={ticket.status === 'closed' || updateTicketMutation.isPending}
                        >
                          Close Ticket
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log("View History button clicked for ticket:", ticket.id);
                            fetchTicketHistory(ticket.id);
                          }}
                        >
                          View History
                        </Button>
                        <Button
                          onClick={() => setSelectedTicketId(selectedTicketId === ticket.id ? null : ticket.id)}
                          variant={selectedTicketId === ticket.id ? "default" : "outline"}
                          size="sm"
                        >
                          {selectedTicketId === ticket.id ? 'Hide Chat' : 'View Chat'}
                        </Button>

                        {/* Ticket History Modal */}
                        {historyDialogs[ticket.id] && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                              <div className="mb-4">
                                <h2 className="text-xl font-semibold">Ticket Status History - #{ticket.id}</h2>
                                <p className="text-gray-600 text-sm">View all status changes and admin comments for this ticket.</p>
                              </div>
                              
                              <div className="max-h-96 overflow-y-auto space-y-4 mb-6">
                                {ticketHistories[ticket.id]?.length > 0 ? (
                                  ticketHistories[ticket.id].map((history: any, index: number) => (
                                    <div key={index} className="border-l-4 border-tea-green pl-4 py-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline" className="text-xs">
                                            {history.oldStatus} → {history.newStatus}
                                          </Badge>
                                          <span className="text-sm font-medium">
                                            {history.updater?.firstName} {history.updater?.lastName}
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {format(new Date(history.createdAt), 'MMM dd, yyyy h:mm a')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        {history.comment}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    No status change history found for this ticket.
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-end">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setHistoryDialogs(prev => ({ ...prev, [ticket.id]: false }))}
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversation Panel */}
                    {selectedTicketId === ticket.id && (
                      <div className="mt-6 border-t pt-6">
                        <h4 className="font-semibold mb-4">Conversation</h4>
                        <Card className="h-96 flex flex-col">
                          <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {(ticketMessages as any[]).length === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No messages yet. Start the conversation!</p>
                              </div>
                            ) : (
                              (ticketMessages as any[]).map((message: any) => (
                                <div 
                                  key={message.id}
                                  className={`flex ${message.isFromSupport ? 'justify-start' : 'justify-end'}`}
                                >
                                  <div 
                                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                                      message.isFromSupport 
                                        ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                                        : 'bg-green-50 border border-green-200 text-green-900'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className={`text-xs font-medium ${
                                        message.isFromSupport ? 'text-blue-600' : 'text-green-600'
                                      }`}>
                                        {message.isFromSupport ? '🎧 Support Admin' : '👤 Customer'}
                                      </span>
                                    </div>
                                    <p className="text-sm">{message.message}</p>
                                    <p className={`text-xs mt-1 ${
                                      message.isFromSupport ? 'text-blue-500' : 'text-green-500'
                                    }`}>
                                      {message.sender ? `${message.sender.firstName} ${message.sender.lastName} - ` : ''}
                                      {format(new Date(message.createdAt), 'MMM dd, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="p-4 border-t">
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Type your response..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newMessage.trim()) {
                                    sendMessageMutation.mutate({ message: newMessage });
                                  }
                                }}
                              />
                              <Button
                                onClick={() => {
                                  if (newMessage.trim()) {
                                    sendMessageMutation.mutate({ message: newMessage });
                                  }
                                }}
                                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                              >
                                Send
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                    </CardContent>
                    </Card>
                  );
                })
                )}
              </div>

              {/* Pagination for Support Tickets */}
              {(filteredTicketsData as any) && (filteredTicketsData as any).total > ticketsPerPage && (
                <div className="mt-6">
                  <Pagination
                    currentPage={ticketsPage}
                    totalPages={Math.ceil((filteredTicketsData as any).total / ticketsPerPage)}
                    onPageChange={setTicketsPage}
                    totalItems={(filteredTicketsData as any).total}
                    itemsPerPage={ticketsPerPage}
                  />
                </div>
              )}
            </div>
          )}

          {currentTab === "faq" && <FaqManagement />}

          {currentTab === "settings" && (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-gray-600">Configure system settings using the button above</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MachineManagement() {
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [machinePrice, setMachinePrice] = useState("5.00");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Machine status helper functions
  const isRecentlyPinged = (lastPing: string | null) => {
    if (!lastPing) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastPing) > fiveMinutesAgo;
  };

  const getMachineStatus = (machine: any) => {
    if (!machine.isActive) return "Disabled";
    if (isRecentlyPinged(machine.lastPing)) return "Online";
    return "Offline";
  };

  const getMachineStatusVariant = (machine: any) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "default";
    if (status === "Offline") return "secondary";
    return "destructive"; // Disabled
  };

  const getMachineStatusIndicator = (machine: any) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "bg-green-400";
    if (status === "Offline") return "bg-yellow-400";
    return "bg-red-400"; // Disabled
  };

  const getTimeSinceLastPing = (lastPing: string | null) => {
    if (!lastPing) return "Never pinged";
    const now = new Date();
    const ping = new Date(lastPing);
    const diffInMinutes = Math.floor((now.getTime() - ping.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ["/api/admin/business-units"],
    retry: false,
  });

  // Helper function to get business unit name
  const getBusinessUnitName = (businessUnitId: string) => {
    const unit = (businessUnits as any[]).find((unit: any) => unit.id === businessUnitId);
    return unit ? unit.name : "Unassigned";
  };

  // Sorting function
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort machines
  const sortedMachines = [...(machines as any[])].sort((a: any, b: any) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'businessUnit':
        aValue = getBusinessUnitName(a.businessUnitId);
        bValue = getBusinessUnitName(b.businessUnitId);
        break;
      case 'location':
        aValue = a.location || '';
        bValue = b.location || '';
        break;
      case 'status':
        aValue = getMachineStatus(a);
        bValue = getMachineStatus(b);
        break;
      case 'price':
        aValue = parseFloat(a.teaTypes?.[0]?.price || '0');
        bValue = parseFloat(b.teaTypes?.[0]?.price || '0');
        break;
      case 'lastPing':
        aValue = a.lastPing ? new Date(a.lastPing).getTime() : 0;
        bValue = b.lastPing ? new Date(b.lastPing).getTime() : 0;
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter and search machines (after sorting)
  const filteredMachines = sortedMachines.filter((machine: any) => {
    const matchesSearch = !searchTerm || 
      machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getBusinessUnitName(machine.businessUnitId)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || getMachineStatus(machine).toLowerCase() === statusFilter.toLowerCase();
    
    const matchesBusinessUnit = businessUnitFilter === "all" || 
      (businessUnitFilter === "unassigned" ? !machine.businessUnitId : machine.businessUnitId === businessUnitFilter);
    
    return matchesSearch && matchesStatus && matchesBusinessUnit;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMachines = filteredMachines.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  const resetPage = () => setCurrentPage(1);

  const updateMachinePriceMutation = useMutation({
    mutationFn: async ({ machineId, price }: { machineId: string; price: string }) => {
      return apiRequest('PATCH', `/api/admin/machines/${machineId}/pricing`, {
        price: price
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tea price updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      setEditingMachine(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update tea price",
        variant: "destructive" 
      });
    }
  });

  const startPriceEdit = (machine: any) => {
    setEditingMachine(machine);
    // Extract current price from machine's price field (simplified pricing system)
    const currentPrice = machine.price || "5.00";
    setMachinePrice(currentPrice);
  };

  const handlePriceUpdate = () => {
    if (!machinePrice || parseFloat(machinePrice) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      });
      return;
    }
    updateMachinePriceMutation.mutate({ 
      machineId: editingMachine.id, 
      price: parseFloat(machinePrice).toFixed(2) 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Machine Management & Pricing</h3>
          <p className="text-sm text-muted-foreground">
            Manage tea machines and set pricing for "Regular Tea" served by each machine
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
            {(machines as any[]).length} Total
          </Badge>
          <Badge variant="default" className="bg-green-100 text-green-700">
            {(machines as any[]).filter((m: any) => getMachineStatus(m) === "Online").length} Online
          </Badge>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            {(machines as any[]).filter((m: any) => getMachineStatus(m) === "Offline").length} Offline
          </Badge>
          <Badge variant="destructive" className="bg-red-100 text-red-700">
            {(machines as any[]).filter((m: any) => getMachineStatus(m) === "Disabled").length} Disabled
          </Badge>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by machine name, location, ID, or business unit..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetPage();
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {viewMode === 'table' ? 'Card View' : 'Table View'}
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
              className="w-32 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="disabled">Disabled</option>
            </select>

            <select
              value={businessUnitFilter}
              onChange={(e) => { setBusinessUnitFilter(e.target.value); resetPage(); }}
              className="w-48 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Business Units</option>
              <option value="unassigned">Unassigned</option>
              {(businessUnits as any[]).map((unit: any) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>

            <select
              value={itemsPerPage.toString()}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); resetPage(); }}
              className="w-32 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>

            {/* Results Count */}
            <div className="text-sm text-gray-600 ml-auto">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredMachines.length)} of {filteredMachines.length} machines
            </div>
          </div>
        </div>
      </Card>

      {machinesLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading machines...
          </CardContent>
        </Card>
      ) : !machines || (machines as any[]).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tea machines found</p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('name')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'name' ? 'text-tea-green' : ''
                      }`}
                    >
                      Machine
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('businessUnit')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'businessUnit' ? 'text-tea-green' : ''
                      }`}
                    >
                      Business Unit
                      {sortBy === 'businessUnit' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('location')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'location' ? 'text-tea-green' : ''
                      }`}
                    >
                      Location
                      {sortBy === 'location' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('status')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'status' ? 'text-tea-green' : ''
                      }`}
                    >
                      Status
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('price')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'price' ? 'text-tea-green' : ''
                      }`}
                    >
                      Price
                      {sortBy === 'price' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button
                      onClick={() => handleSort('lastPing')}
                      className={`flex items-center gap-2 hover:text-tea-green transition-colors ${
                        sortBy === 'lastPing' ? 'text-tea-green' : ''
                      }`}
                    >
                      Last Ping
                      {sortBy === 'lastPing' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMachines.length > 0 ? (
                  paginatedMachines.map((machine: any) => (
                    <tr key={machine.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getMachineStatusIndicator(machine)}`} />
                          <div>
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-xs text-gray-500">ID: {machine.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-900">
                          {getBusinessUnitName(machine.businessUnitId)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">{machine.location}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant={getMachineStatusVariant(machine)}>
                          {getMachineStatus(machine)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-lg font-bold text-tea-green">
                          ₹{machine.price || "5.00"}
                        </div>
                        <div className="text-xs text-gray-500">per cup</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600">
                          {machine.lastPing ? format(new Date(machine.lastPing), 'MMM dd, h:mm a') : 'Never'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {getTimeSinceLastPing(machine.lastPing)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startPriceEdit(machine)}
                          className="flex items-center space-x-2"
                        >
                          <IndianRupee className="w-4 h-4" />
                          <span>Edit Price</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      {filteredMachines.length === 0 ? "No machines match your search criteria." : "No machines found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {paginatedMachines.map((machine: any) => (
            <Card key={machine.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${getMachineStatusIndicator(machine)}`} />
                    <div>
                      <h4 className="font-semibold text-lg">{machine.name}</h4>
                      <p className="text-gray-600 text-sm">{machine.location}</p>
                      <p className="text-xs text-gray-500">ID: {machine.id}</p>
                      <p className="text-xs text-gray-500">Business Unit: {getBusinessUnitName(machine.businessUnitId)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <Badge variant={getMachineStatusVariant(machine)} className="mb-2">
                        {getMachineStatus(machine)}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Last ping: {machine.lastPing ? format(new Date(machine.lastPing), 'MMM dd, h:mm a') : 'Never'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getTimeSinceLastPing(machine.lastPing)}
                      </p>
                    </div>
                    
                    <div className="text-center border-l pl-6">
                      <div className="text-lg font-bold text-tea-green">
                        ₹{machine.price || "5.00"}
                      </div>
                      <p className="text-xs text-gray-500">per cup</p>
                      <p className="text-xs text-gray-600 font-medium">Regular Tea</p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startPriceEdit(machine)}
                      className="flex items-center space-x-2"
                    >
                      <IndianRupee className="w-4 h-4" />
                      <span>Edit Price</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination for cards view */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

      {/* Price Edit Modal */}
      {editingMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Update Tea Price</h2>
              <p className="text-gray-600 text-sm">
                Set the price per cup for "{editingMachine.name}"
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="machineInfo">Machine Details</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{editingMachine.name}</p>
                  <p className="text-sm text-gray-600">{editingMachine.location}</p>
                  <p className="text-xs text-gray-500">ID: {editingMachine.id}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="teaType">Tea Type</Label>
                <Input
                  value="Regular Tea"
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Only "Regular Tea" is served by all machines</p>
              </div>
              
              <div>
                <Label htmlFor="price">Price per Cup (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={machinePrice}
                  onChange={(e) => setMachinePrice(e.target.value)}
                  placeholder="5.00"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the price in rupees (e.g., 5.00)</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditingMachine(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePriceUpdate}
                disabled={updateMachinePriceMutation.isPending}
                className="bg-tea-green hover:bg-tea-dark"
              >
                {updateMachinePriceMutation.isPending ? "Updating..." : "Update Price"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MachineAdministration() {
  const [activeTab, setActiveTab] = useState("create");
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [newMachine, setNewMachine] = useState({
    id: "",
    name: "",
    location: "",
    businessUnitId: "",
    isActive: true
  });

  // Fetch next machine ID when component loads
  const { data: nextIdData } = useQuery({
    queryKey: ["/api/admin/machines/next-id"],
    retry: false,
  });

  // Update machine ID when next ID is fetched
  useEffect(() => {
    if ((nextIdData as any)?.nextId && !newMachine.id) {
      setNewMachine(prev => ({ ...prev, id: (nextIdData as any).nextId }));
    }
  }, [nextIdData, newMachine.id]);
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    isActive: true
  });
  const [assignForm, setAssignForm] = useState({
    machineId: "",
    businessUnitId: ""
  });
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // "all", "assigned", "unassigned"
  const assignmentsPerPage = 10;
  // Edit machines search and filter state
  const [editSearchTerm, setEditSearchTerm] = useState("");
  const [editStatusFilter, setEditStatusFilter] = useState("all");
  const [editBusinessUnitFilter, setEditBusinessUnitFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all machines for admin management
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/admin/machines"],
    retry: false,
  });

  // Fetch business units for assignment
  const { data: businessUnits = [], isLoading: businessUnitsLoading } = useQuery({
    queryKey: ["/api/admin/business-units"],
    retry: false,
  });

  // Machine status helper functions (same as other components)
  const isRecentlyPinged = (lastPing: string | null) => {
    if (!lastPing) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastPing) > fiveMinutesAgo;
  };

  const getMachineStatus = (machine: any) => {
    if (!machine.isActive) return "Disabled";
    if (isRecentlyPinged(machine.lastPing)) return "Online";
    return "Offline";
  };

  const getMachineStatusVariant = (machine: any) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "default";
    if (status === "Offline") return "secondary";
    return "destructive";
  };

  const getMachineStatusIndicator = (machine: any) => {
    const status = getMachineStatus(machine);
    if (status === "Online") return "bg-green-400";
    if (status === "Offline") return "bg-yellow-400";
    return "bg-red-400";
  };

  // Helper function to get business unit name
  const getBusinessUnitName = (businessUnitId: string) => {
    const unit = (businessUnits as any[]).find((unit: any) => unit.id === businessUnitId);
    return unit ? unit.name : "Unassigned";
  };

  // Filter and search machines for edit tab
  const filteredEditMachines = (machines as any[]).filter((machine: any) => {
    const matchesSearch = !editSearchTerm || 
      machine.name?.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
      machine.location?.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
      machine.id?.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
      getBusinessUnitName(machine.businessUnitId)?.toLowerCase().includes(editSearchTerm.toLowerCase());
    
    const matchesStatus = editStatusFilter === "all" || getMachineStatus(machine).toLowerCase() === editStatusFilter.toLowerCase();
    
    const matchesBusinessUnit = editBusinessUnitFilter === "all" || 
      (editBusinessUnitFilter === "unassigned" ? !machine.businessUnitId : machine.businessUnitId === editBusinessUnitFilter);
    
    return matchesSearch && matchesStatus && matchesBusinessUnit;
  });

  // Create machine mutation
  const createMachineMutation = useMutation({
    mutationFn: (data: typeof newMachine) =>
      apiRequest("POST", "/api/admin/machines", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines/next-id"] });
      toast({ title: "Success", description: "Machine created successfully!" });
      setNewMachine({ id: "", name: "", location: "", businessUnitId: "", isActive: true });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create machine",
        variant: "destructive" 
      });
    }
  });

  // Update machine mutation
  const updateMachineMutation = useMutation({
    mutationFn: ({ machineId, data }: { machineId: string; data: typeof editForm }) =>
      apiRequest("PATCH", `/api/admin/machines/${machineId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      toast({ title: "Success", description: "Machine updated successfully!" });
      setEditingMachine(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update machine",
        variant: "destructive" 
      });
    }
  });

  // Toggle machine status mutation
  const toggleMachineStatusMutation = useMutation({
    mutationFn: ({ machineId, isActive }: { machineId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/machines/${machineId}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      toast({ title: "Success", description: "Machine status updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update machine status",
        variant: "destructive" 
      });
    }
  });

  // Assign machine mutation
  const assignMachineMutation = useMutation({
    mutationFn: (data: typeof assignForm) =>
      apiRequest("PATCH", `/api/admin/machines/${data.machineId}/assign`, { 
        businessUnitId: data.businessUnitId 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/machines"] });
      toast({ title: "Success", description: "Machine assigned successfully!" });
      setAssignForm({ machineId: "", businessUnitId: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to assign machine",
        variant: "destructive" 
      });
    }
  });

  const handleCreateMachine = () => {
    if (!newMachine.name.trim() || !newMachine.location.trim()) {
      toast({
        title: "Error",
        description: "Please fill in name and location",
        variant: "destructive"
      });
      return;
    }
    createMachineMutation.mutate(newMachine);
  };

  const handleEditMachine = (machine: any) => {
    setEditingMachine(machine);
    setEditForm({
      name: machine.name,
      location: machine.location,
      isActive: machine.isActive
    });
  };

  const handleUpdateMachine = () => {
    if (!editForm.name.trim() || !editForm.location.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    updateMachineMutation.mutate({ 
      machineId: editingMachine.id, 
      data: editForm 
    });
  };

  const handleAssignMachine = () => {
    if (!assignForm.machineId || !assignForm.businessUnitId) {
      toast({
        title: "Error",
        description: "Please select both machine and business unit",
        variant: "destructive"
      });
      return;
    }
    assignMachineMutation.mutate(assignForm);
  };

  // Filter and paginate assignments
  const filteredMachines = (machines as any[]).filter((machine: any) => {
    if (assignmentFilter === "assigned") return machine.businessUnitId;
    if (assignmentFilter === "unassigned") return !machine.businessUnitId;
    return true; // "all"
  });

  const paginatedAssignments = filteredMachines.slice(
    (assignmentsPage - 1) * assignmentsPerPage,
    assignmentsPage * assignmentsPerPage
  );

  const totalAssignmentPages = Math.ceil(filteredMachines.length / assignmentsPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Machine Administration</h3>
        <p className="text-sm text-muted-foreground">
          Create, edit, control, and assign tea machines to business units
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Machine</TabsTrigger>
          <TabsTrigger value="edit">Edit Machines</TabsTrigger>
          <TabsTrigger value="assign">Assign Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Create New Machine</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="machine-id">Machine ID *</Label>
                  <Input
                    id="machine-id"
                    placeholder="Auto-generated"
                    value={newMachine.id}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated with format UK_XXXX</p>
                </div>
                <div>
                  <Label htmlFor="machine-name">Machine Name *</Label>
                  <Input
                    id="machine-name"
                    placeholder="Tea Station Echo"
                    value={newMachine.name}
                    onChange={(e) => setNewMachine(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="machine-location">Location *</Label>
                <Input
                  id="machine-location"
                  placeholder="Building A, 3rd Floor, Break Room"
                  value={newMachine.location}
                  onChange={(e) => setNewMachine(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="business-unit">Business Unit (Optional)</Label>
                <select
                  id="business-unit"
                  value={newMachine.businessUnitId}
                  onChange={(e) => setNewMachine(prev => ({ ...prev, businessUnitId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Leave Unassigned</option>
                  {(businessUnits as any[]).map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Machines can be assigned to business units later</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newMachine.isActive}
                  onCheckedChange={(checked) => setNewMachine(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Machine Active</Label>
              </div>
              <Button 
                onClick={handleCreateMachine}
                disabled={createMachineMutation.isPending}
                className="w-full"
              >
                {createMachineMutation.isPending ? "Creating..." : "Create Machine"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          {/* Search and Filter Controls for Edit Machines */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by machine name, location, ID, or business unit..."
                    value={editSearchTerm}
                    onChange={(e) => setEditSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
                  {filteredEditMachines.length} of {(machines as any[]).length} machines
                </Badge>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                
                <select
                  value={editStatusFilter}
                  onChange={(e) => setEditStatusFilter(e.target.value)}
                  className="w-32 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="disabled">Disabled</option>
                </select>

                <select
                  value={editBusinessUnitFilter}
                  onChange={(e) => setEditBusinessUnitFilter(e.target.value)}
                  className="w-48 h-9 px-3 py-1 border border-input bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Business Units</option>
                  <option value="unassigned">Unassigned</option>
                  {(businessUnits as any[]).map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>

                {(editSearchTerm || editStatusFilter !== "all" || editBusinessUnitFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditSearchTerm("");
                      setEditStatusFilter("all");
                      setEditBusinessUnitFilter("all");
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {machinesLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  Loading machines...
                </CardContent>
              </Card>
            ) : (machines as any[]).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No machines found</p>
                </CardContent>
              </Card>
            ) : filteredEditMachines.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No machines match your search criteria</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditSearchTerm("");
                      setEditStatusFilter("all");
                      setEditBusinessUnitFilter("all");
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredEditMachines.map((machine: any) => (
                <Card key={machine.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getMachineStatusIndicator(machine)}`} />
                        <div>
                          <h4 className="font-semibold">{machine.name}</h4>
                          <p className="text-sm text-gray-600">{machine.location}</p>
                          <p className="text-xs text-gray-500">ID: {machine.id}</p>
                          <p className="text-xs text-gray-500">
                            {machine.businessUnitId ? 
                              `Assigned to: ${(businessUnits as any[]).find((unit: any) => unit.id === machine.businessUnitId)?.name || 'Unknown Business Unit'}` :
                              'Unassigned'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getMachineStatusVariant(machine)}>
                          {getMachineStatus(machine)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMachineStatusMutation.mutate({
                            machineId: machine.id,
                            isActive: !machine.isActive
                          })}
                          disabled={toggleMachineStatusMutation.isPending}
                          title={machine.isActive ? "Disable Machine" : "Enable Machine"}
                        >
                          {machine.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMachine(machine)}
                          title="Edit Machine Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Edit Machine Modal */}
          {editingMachine && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Edit Machine</h2>
                  <p className="text-gray-600 text-sm">Update machine details for {editingMachine.id}</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Machine Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location *</Label>
                    <Input
                      id="edit-location"
                      value={editForm.location}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editForm.isActive}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Machine Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditingMachine(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateMachine}
                    disabled={updateMachineMutation.isPending}
                  >
                    {updateMachineMutation.isPending ? "Updating..." : "Update Machine"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>Assign Machine to Business Unit</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assign-machine">Select Machine</Label>
                  <select
                    id="assign-machine"
                    value={assignForm.machineId}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, machineId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a machine</option>
                    {(machines as any[]).map((machine: any) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} ({machine.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="assign-business-unit">Business Unit</Label>
                  <select
                    id="assign-business-unit"
                    value={assignForm.businessUnitId}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, businessUnitId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a business unit</option>
                    {(businessUnits as any[]).map((unit: any) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button 
                onClick={handleAssignMachine}
                disabled={assignMachineMutation.isPending}
                className="w-full"
              >
                {assignMachineMutation.isPending ? "Assigning..." : "Assign Machine"}
              </Button>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Machine Assignments</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="assignment-filter" className="text-sm">Filter:</Label>
                  <select
                    id="assignment-filter"
                    value={assignmentFilter}
                    onChange={(e) => {
                      setAssignmentFilter(e.target.value);
                      setAssignmentsPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Machines ({(machines as any[]).length})</option>
                    <option value="assigned">Assigned ({(machines as any[]).filter((m: any) => m.businessUnitId).length})</option>
                    <option value="unassigned">Unassigned ({(machines as any[]).filter((m: any) => !m.businessUnitId).length})</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paginatedAssignments.map((machine: any) => {
                  const assignedUnit = (businessUnits as any[]).find((unit: any) => unit.id === machine.businessUnitId);
                  return (
                    <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getMachineStatusIndicator(machine)}`} />
                        <div>
                          <p className="font-medium">{machine.name}</p>
                          <p className="text-sm text-gray-600">{machine.location}</p>
                          <p className="text-xs text-gray-500">ID: {machine.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {assignedUnit ? (
                          <>
                            <p className="font-medium">{assignedUnit.name}</p>
                            <p className="text-sm text-gray-600">{assignedUnit.code}</p>
                            <Badge variant="default" className="text-xs mt-1">Assigned</Badge>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-400">Unassigned</p>
                            <Badge variant="secondary" className="text-xs mt-1">Available</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredMachines.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {assignmentFilter === "assigned" && "No machines assigned yet"}
                    {assignmentFilter === "unassigned" && "All machines are assigned"}
                    {assignmentFilter === "all" && "No machines found"}
                  </p>
                )}
              </div>
              
              {/* Pagination */}
              {totalAssignmentPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {Math.min((assignmentsPage - 1) * assignmentsPerPage + 1, filteredMachines.length)} to{' '}
                    {Math.min(assignmentsPage * assignmentsPerPage, filteredMachines.length)} of{' '}
                    {filteredMachines.length} machines
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignmentsPage(prev => Math.max(1, prev - 1))}
                      disabled={assignmentsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {assignmentsPage} of {totalAssignmentPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignmentsPage(prev => Math.min(totalAssignmentPages, prev + 1))}
                      disabled={assignmentsPage === totalAssignmentPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}

function FaqManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqData, setFaqData] = useState({ question: '', answer: '', category: 'general' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: faqList = [], refetch: refetchFaq } = useQuery({
    queryKey: ['/api/faq'],
    refetchInterval: 5000,
  });

  const createFaqMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string; category: string }) => {
      return apiRequest('POST', '/api/admin/faq', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ created successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
      setShowCreateForm(false);
      setFaqData({ question: '', answer: '', category: 'general' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create FAQ",
        variant: "destructive" 
      });
    }
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { question: string; answer: string; category: string } }) => {
      return apiRequest('PATCH', `/api/admin/faq/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ updated successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
      setEditingFaq(null);
      setFaqData({ question: '', answer: '', category: 'general' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update FAQ",
        variant: "destructive" 
      });
    }
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/faq/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "FAQ deleted successfully!" });
      // Invalidate all FAQ-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/faq'] });
      refetchFaq();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete FAQ",
        variant: "destructive" 
      });
    }
  });

  const handleCreate = () => {
    if (!faqData.question.trim() || !faqData.answer.trim()) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive"
      });
      return;
    }
    createFaqMutation.mutate(faqData);
  };

  const handleUpdate = () => {
    if (!faqData.question.trim() || !faqData.answer.trim()) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive"
      });
      return;
    }
    updateFaqMutation.mutate({ id: editingFaq.id, data: faqData });
  };

  const startEdit = (faq: any) => {
    setEditingFaq(faq);
    setFaqData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general'
    });
    setShowCreateForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this FAQ? This action cannot be undone.")) {
      deleteFaqMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingFaq(null);
    setFaqData({ question: '', answer: '', category: 'general' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">FAQ Management</h3>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage frequently asked questions
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New FAQ
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingFaq ? 'Edit FAQ' : 'Create New FAQ'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select 
                value={faqData.category} 
                onChange={(e) => setFaqData({...faqData, category: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="rfid">RFID Cards</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Question *</label>
              <input
                type="text"
                value={faqData.question}
                onChange={(e) => setFaqData({...faqData, question: e.target.value})}
                placeholder="Enter the FAQ question..."
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Answer *</label>
              <textarea
                value={faqData.answer}
                onChange={(e) => setFaqData({...faqData, answer: e.target.value})}
                placeholder="Enter the answer..."
                className="w-full p-2 border rounded-md"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={editingFaq ? handleUpdate : handleCreate}
                disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
              >
                {editingFaq ? (updateFaqMutation.isPending ? "Updating..." : "Update FAQ") : (createFaqMutation.isPending ? "Creating..." : "Create FAQ")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing FAQs ({Array.isArray(faqList) ? faqList.length : 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(faqList) && faqList.length > 0 ? (
              faqList.map((faq: any) => (
                <div key={faq.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{faq.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Views: {faq.views || 0}
                        </span>
                      </div>
                      <h4 className="font-medium text-lg">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEdit(faq)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(faq.id)}
                        disabled={deleteFaqMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No FAQ articles found. Create your first FAQ to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management Component
function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<any>(null);
  
  // Debug modal state
  console.log('🎭 MODAL STATE DEBUG:');
  console.log('🚪 showPasswordModal:', showPasswordModal);
  console.log('👤 createdUserInfo:', createdUserInfo);
  const [newUserData, setNewUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    role: 'business_unit_admin' as 'platform_admin' | 'business_unit_admin'
  });
  const usersLimit = 20;

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: [`/api/admin/users?paginated=true&page=${usersPage}&limit=${usersLimit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`],
    enabled: !!(currentUser as any)?.isAdmin,
  });

  // Admin status toggle mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await fetch(`/api/admin/users/${userId}/admin-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAdmin }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update admin status');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser, { isAdmin }) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0]?.toString()?.includes('/api/admin/users') || false
      });
      toast({
        title: "Success",
        description: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  const handleToggleAdmin = (user: any) => {
    const newAdminStatus = !user.isAdmin;
    const action = newAdminStatus ? 'grant' : 'revoke';
    
    if (confirm(`Are you sure you want to ${action} admin privileges for ${user.firstName} ${user.lastName}?`)) {
      toggleAdminMutation.mutate({ userId: user.id, isAdmin: newAdminStatus });
    }
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      console.log('🚀 STARTING USER CREATION with data:', userData);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.message || 'Failed to create user account');
      }
      
      const result = await response.json();
      console.log('📦 RAW API RESPONSE:', result);
      console.log('📦 Response has generatedPassword:', !!result.generatedPassword);
      console.log('📦 Response has user:', !!result.user);
      
      return result;
    },
    onSuccess: (result) => {
      console.log('✅ User creation mutation SUCCESS with result:', result);
      console.log('🔑 Generated password exists:', !!result.generatedPassword);
      console.log('👤 User data exists:', !!result.user);
      
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0]?.toString()?.includes('/api/admin/users') || false
      });
      
      // Store user info and password to show in modal
      if (result.generatedPassword) {
        console.log('🎯 PASSWORD FOUND! Setting up modal...');
        console.log('🔑 Password value:', result.generatedPassword);
        
        const userInfo = {
          user: result.user,
          generatedPassword: result.generatedPassword
        };
        
        console.log('💾 Setting createdUserInfo to:', userInfo);
        setCreatedUserInfo(userInfo);
        
        console.log('🚪 Opening password modal...');
        setShowPasswordModal(true);
        
        console.log('✨ Password modal state set! Modal should be visible now.');
        
        // Force a debug check after state update
        setTimeout(() => {
          console.log('⏰ POST-STATE UPDATE CHECK:');
          console.log('🚪 showPasswordModal after update:', showPasswordModal);
          console.log('👤 createdUserInfo after update:', createdUserInfo);
        }, 100);
      } else {
        console.error('❌ NO GENERATED PASSWORD in response!');
        console.error('📋 Full response object keys:', Object.keys(result));
        toast({
          title: "Error", 
          description: "Password was not generated properly. Please check server logs.",
          variant: "destructive",
        });
      }
      
      // Don't reset form or close create form if we're showing password modal
      if (!result.generatedPassword) {
        setShowCreateForm(false);
        setNewUserData({ email: '', firstName: '', lastName: '', mobileNumber: '', role: 'business_unit_admin' });
      } else {
        console.log('🔒 Not resetting form - keeping password modal context');
      }
    },
    onError: (error: any) => {
      console.error('❌ User creation FAILED:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user account",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0]?.toString()?.includes('/api/admin/users') || false
      });
      toast({
        title: "Success",
        description: "User account deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user account",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.email || !newUserData.firstName || !newUserData.lastName || !newUserData.mobileNumber) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    // Validate mobile number format
    const mobileRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!mobileRegex.test(newUserData.mobileNumber.replace(/\s+/g, ''))) {
      toast({
        title: "Error",
        description: "Please enter a valid mobile number",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate(newUserData);
  };

  const handleDeleteUser = (user: any) => {
    if (confirm(`Are you sure you want to delete the account for ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const filteredUsers = (usersData as any)?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Admin-only account creation - no public registration allowed
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </Button>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Badge variant="secondary" className="bg-tea-green/10 text-tea-green">
            {(usersData as any)?.total || 0} Total Users
          </Badge>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="border-2 border-tea-green/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-tea-green" />
              <span>Create New User Account</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create a new user account with auto-generated secure password. Share the email and password with the user for login.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label htmlFor="email">Email Address*</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name*</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name*</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile Number*</Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newUserData.mobileNumber}
                  onChange={(e) => setNewUserData({ ...newUserData, mobileNumber: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="role">User Role*</Label>
              <select
                id="role"
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as typeof newUserData.role })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tea-green focus:border-tea-green"
              >
                <option value="platform_admin">Platform Admin - Full system access</option>
                <option value="business_unit_admin">Business Unit Admin - Manage tea programs</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {newUserData.role === 'platform_admin' && 'Can create accounts, manage all business units, and access system settings'}
                {newUserData.role === 'business_unit_admin' && 'Can manage assigned business units, wallets, and RFID cards'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewUserData({ email: '', firstName: '', lastName: '', mobileNumber: '', role: 'business_unit_admin' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="flex items-center space-x-2"
              >
                {createUserMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {usersLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            Loading users...
          </CardContent>
        </Card>
      ) : !filteredUsers.length ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-tea-green to-tea-dark rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-semibold text-lg">
                          {user.firstName} {user.lastName}
                        </h4>
                        {user.isSuperAdmin && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Platform Admin
                          </Badge>
                        )}
                        {user.isAdmin && !user.isSuperAdmin && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            <Shield className="w-3 h-3 mr-1" />
                            Business Unit Admin
                          </Badge>
                        )}

                        {user.id === (currentUser as any)?.id && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{user.email}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Wallet className="w-3 h-3 mr-1" />
                          ₹{parseFloat(user.walletBalance || "0").toFixed(2)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {user.id !== (currentUser as any)?.id && (currentUser as any)?.isSuperAdmin && (
                      <>
                        <Button
                          variant={user.isAdmin ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={toggleAdminMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          {user.isAdmin ? (
                            <>
                              <UserMinus className="w-4 h-4" />
                              <span>Revoke Admin</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Grant Admin</span>
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          disabled={deleteUserMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedUserDetails(user)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(usersData as any)?.total && (usersData as any).total > usersLimit && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
            disabled={usersPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600 px-4">
            Page {usersPage} of {Math.ceil((usersData as any).total / usersLimit)}
          </span>
          
          <Button 
            variant="outline"
            size="sm" 
            onClick={() => setUsersPage(p => p + 1)}
            disabled={usersPage >= Math.ceil((usersData as any).total / usersLimit)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">User Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserDetails(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-sm text-gray-900">{selectedUserDetails.firstName} {selectedUserDetails.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-sm text-gray-900">{selectedUserDetails.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">User ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedUserDetails.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Status</label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedUserDetails.isAdmin ? "default" : "secondary"}>
                        {selectedUserDetails.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Account Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Wallet Balance</label>
                    <p className="text-sm text-gray-900 font-medium">₹{parseFloat(selectedUserDetails.walletBalance || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Created</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedUserDetails.createdAt), 'MMMM dd, yyyy h:mm a')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedUserDetails.updatedAt), 'MMMM dd, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Profile Picture</div>
                  {selectedUserDetails.profilePicture ? (
                    <img 
                      src={selectedUserDetails.profilePicture} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full mt-2"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-tea-green to-tea-dark rounded-full flex items-center justify-center mt-2">
                      <span className="text-white font-medium text-lg">
                        {(selectedUserDetails.firstName?.[0] || '') + (selectedUserDetails.lastName?.[0] || '')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Account Age</div>
                  <div className="text-lg font-semibold text-green-800 mt-1">
                    {Math.floor((new Date().getTime() - new Date(selectedUserDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">User Type</div>
                  <div className="text-lg font-semibold text-purple-800 mt-1">
                    {selectedUserDetails.isAdmin ? "Administrator" : "Regular User"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      <Dialog 
        open={showPasswordModal} 
        onOpenChange={(open) => {
          console.log('🚪 Dialog onOpenChange called with:', open);
          console.log('🚪 Current showPasswordModal state:', showPasswordModal);
          console.log('🚪 createdUserInfo exists:', !!createdUserInfo);
          
          // Don't allow closing if we just set it to open and have user info
          if (!open && createdUserInfo) {
            console.log('🔒 Preventing modal close - user just created');
            return;
          }
          
          setShowPasswordModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span>Account Created Successfully!</span>
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the new user
            </DialogDescription>
          </DialogHeader>
          
          {createdUserInfo && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">User Email</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={createdUserInfo.user.email} 
                        readOnly 
                        className="bg-white" 
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.user.email);
                          toast({ title: "Copied!", description: "Email copied to clipboard" });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Generated Password</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={createdUserInfo.generatedPassword} 
                        readOnly 
                        className="bg-white font-mono" 
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.generatedPassword);
                          toast({ title: "Copied!", description: "Password copied to clipboard" });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Important Instructions</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Share the email and password with the user. They can log in at your UrbanKetl portal. 
                      The user will be required to change their password on first login.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🔚 Close button clicked - closing modal and resetting form');
                    setShowPasswordModal(false);
                    setCreatedUserInfo(null);
                    setShowCreateForm(false);
                    setNewUserData({ email: '', firstName: '', lastName: '', mobileNumber: '', role: 'business_unit_admin' });
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const credentials = `Email: ${createdUserInfo.user.email}\nPassword: ${createdUserInfo.generatedPassword}`;
                    navigator.clipboard.writeText(credentials);
                    toast({ title: "Copied!", description: "Both credentials copied to clipboard" });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Copy Both
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RfidManagement({ rfidCardsPage, setRfidCardsPage, rfidCardsPerPage }: { 
  rfidCardsPage: number;
  setRfidCardsPage: (page: number) => void;
  rfidCardsPerPage: number;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [selectedCardToAssign, setSelectedCardToAssign] = useState<string>("");
  const [assignToBusinessUnit, setAssignToBusinessUnit] = useState<string>("");
  
  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // all, assigned, unassigned
  const [businessUnitFilter, setBusinessUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt, cardNumber, businessUnit
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState(rfidCardsPerPage);
  
  const { toast } = useToast();

  const { data: businessUnits } = useQuery({
    queryKey: ["/api/admin/business-units"],
  });

  // Build query string with filters and sorting
  const queryString = new URLSearchParams({
    paginated: "true",
    page: rfidCardsPage.toString(),
    limit: itemsPerPage.toString(),
    ...(searchTerm && { search: searchTerm }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(assignmentFilter !== "all" && { assignment: assignmentFilter }),
    ...(businessUnitFilter !== "all" && { businessUnitId: businessUnitFilter }),
    sortBy,
    sortOrder,
  }).toString();

  const { data: rfidCardsData, refetch: refetchCards } = useQuery({
    queryKey: [`/api/admin/rfid/cards?${queryString}`],
  });

  const rfidCards = (rfidCardsData as any)?.cards || [];
  const rfidCardsTotal = (rfidCardsData as any)?.total || 0;

  // Reset page when filters change
  useEffect(() => {
    setRfidCardsPage(1);
  }, [searchTerm, statusFilter, assignmentFilter, businessUnitFilter, sortBy, sortOrder, itemsPerPage]);



  const createCardMutation = useMutation({
    mutationFn: async (data: { businessUnitId?: string; cardNumber: string; cardName?: string; batchSize?: number }) => {
      const response = await fetch('/api/admin/rfid/cards/create-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create card(s)');
      return response.json();
    },
    onSuccess: () => {
      refetchCards();
      setShowCreateForm(false);
      setSelectedBusinessUnit("");
      setCardNumber("");
      setCardName("");
      setBatchSize(1);
      toast({
        title: "Success",
        description: "RFID card(s) created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFID card",
        variant: "destructive",
      });
    },
  });

  const assignCardMutation = useMutation({
    mutationFn: async (data: { cardId: string; businessUnitId: string }) => {
      const response = await fetch('/api/admin/rfid/cards/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to assign card');
      return response.json();
    },
    onSuccess: () => {
      refetchCards();
      setShowAssignForm(false);
      setSelectedCardToAssign("");
      setAssignToBusinessUnit("");
      toast({
        title: "Success",
        description: "RFID card assigned to business unit successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign RFID card",
        variant: "destructive",
      });
    },
  });



  const handleCreateCard = () => {
    if (batchSize === 1 && (!cardNumber || cardNumber.length < 6)) {
      toast({
        title: "Validation Error",
        description: "Card number must be 6-20 characters long",
        variant: "destructive",
      });
      return;
    }
    
    createCardMutation.mutate({
      businessUnitId: selectedBusinessUnit || undefined,
      cardNumber: cardNumber,
      cardName: cardName || undefined,
      batchSize: batchSize,
    });
  };

  const handleAssignCard = () => {
    if (!selectedCardToAssign || !assignToBusinessUnit) return;
    
    assignCardMutation.mutate({
      cardId: selectedCardToAssign,
      businessUnitId: assignToBusinessUnit,
    });
  };

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await fetch(`/api/admin/rfid/cards/${cardId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete card');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "RFID card deleted successfully" });
      refetchCards();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete RFID card",
        variant: "destructive" 
      });
    },
  });

  const handleDeleteCard = (cardId: number) => {
    if (confirm("Are you sure you want to delete this RFID card? This action cannot be undone.")) {
      deleteCardMutation.mutate(cardId);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">RFID Card Creation & Assignment</h3>
          <p className="text-sm text-muted-foreground">
            Platform admins create RFID cards and assign them to business units
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Assign Cards
          </Button>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Cards
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Create RFID Cards (Platform Admin)
            </CardTitle>
            <CardDescription>
              Create RFID cards for business distribution. Cards can be assigned immediately or kept unassigned for later assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Assign to Business Unit (Optional)</label>
                <select 
                  value={selectedBusinessUnit} 
                  onChange={(e) => setSelectedBusinessUnit(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Keep Unassigned</option>
                  {(businessUnits as any[])?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Cards can be assigned later if needed</p>
              </div>

              <div>
                <label className="text-sm font-medium">Batch Size</label>
                <select 
                  value={batchSize} 
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={1}>Single Card</option>
                  <option value={5}>5 Cards</option>
                  <option value={10}>10 Cards</option>
                  <option value={25}>25 Cards</option>
                  <option value={50}>50 Cards</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Create multiple cards at once</p>
              </div>

              {batchSize === 1 && (
                <>
                  <div>
                    <label className="text-sm font-medium">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        // Allow only alphanumeric, underscores, and hyphens, max 20 chars
                        if (/^[A-Z0-9_-]*$/.test(value) && value.length <= 20) {
                          setCardNumber(value);
                        }
                      }}
                      placeholder="e.g., RFID_CORP_001"
                      className="w-full p-2 border rounded-md"
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      6-20 characters: letters, numbers, underscore, hyphen only
                    </p>
                    {cardNumber.length > 0 && cardNumber.length < 6 && (
                      <p className="text-xs text-red-500 mt-1">Minimum 6 characters required</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Card Name (Optional)</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g., Employee Card #1"
                      className="w-full p-2 border rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Friendly name for the card</p>
                  </div>
                </>
              )}
            </div>

            {selectedBusinessUnit && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Assignment Preview:</h4>
                <p className="text-green-800">
                  {batchSize} card(s) will be assigned to: {(businessUnits as any[])?.find(u => u.id === selectedBusinessUnit)?.name}
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Business unit admin will receive these cards for employee distribution
                </p>
              </div>
            )}

            {!selectedBusinessUnit && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Unassigned Cards:</h4>
                <p className="text-yellow-800">
                  {batchSize} card(s) will be created without business unit assignment
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Use "Assign Cards" to distribute them to business units later
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCard}
                disabled={(batchSize === 1 && !cardNumber) || createCardMutation.isPending}
              >
                {createCardMutation.isPending ? "Creating..." : `Create ${batchSize} Card${batchSize > 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showAssignForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Assign Cards to Business Units
            </CardTitle>
            <CardDescription>
              Assign unassigned RFID cards to business units for employee distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Select Unassigned Card</label>
                <select 
                  value={selectedCardToAssign} 
                  onChange={(e) => setSelectedCardToAssign(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Choose a card...</option>
                  {rfidCards?.filter((card: any) => !card.businessUnitId).map((card: any) => (
                    <option key={card.id} value={card.id}>
                      {card.cardNumber} {card.cardName ? `(${card.cardName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Only unassigned cards are shown</p>
              </div>

              <div>
                <label className="text-sm font-medium">Assign to Business Unit</label>
                <select 
                  value={assignToBusinessUnit} 
                  onChange={(e) => setAssignToBusinessUnit(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Choose business unit...</option>
                  {(businessUnits as any[])?.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignCard}
                disabled={!selectedCardToAssign || !assignToBusinessUnit || assignCardMutation.isPending}
              >
                {assignCardMutation.isPending ? "Assigning..." : "Assign Card"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All RFID Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="space-y-4 mb-6">
            {/* Search and Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by card number or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Assignment Filter */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Cards</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>

              {/* Business Unit Filter */}
              <select
                value={businessUnitFilter}
                onChange={(e) => setBusinessUnitFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Business Units</option>
                {(businessUnits as any[])?.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort and Items Per Page Row */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="cardNumber">Card Number</option>
                  <option value="businessUnit">Business Unit</option>
                  <option value="lastUsed">Last Used</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-2"
                >
                  {sortOrder === "asc" ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Items Per Page */}
              <div className="flex items-center gap-2">
                <Label htmlFor="items-per-page" className="text-sm font-medium">Show:</Label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-500">per page</span>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {rfidCards.length} of {rfidCardsTotal} cards
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>

          {/* Card List */}
          <div className="space-y-4">
            {rfidCards?.map((card: any) => (
              <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="font-medium">{card.cardNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {card.cardName && <span className="font-medium">{card.cardName} • </span>}
                      {card.businessUnit?.name ? (
                        <span className="text-tea-green font-medium">Assigned to: {card.businessUnit.name}</span>
                      ) : (
                        <span className="text-orange-600 font-medium">Unassigned</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                      {card.lastUsed && (
                        <span> • Last used: {new Date(card.lastUsed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={card.isActive ? "default" : "secondary"}>
                    {card.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    disabled={deleteCardMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {(!rfidCards || rfidCards.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No RFID cards found
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {rfidCardsTotal > itemsPerPage && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {rfidCardsPage} of {Math.ceil(rfidCardsTotal / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRfidCardsPage(Math.max(1, rfidCardsPage - 1))}
                    disabled={rfidCardsPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.ceil(rfidCardsTotal / itemsPerPage);
                      const pages = [];
                      const showPages = 5;
                      let startPage = Math.max(1, rfidCardsPage - Math.floor(showPages / 2));
                      let endPage = Math.min(totalPages, startPage + showPages - 1);
                      
                      if (endPage - startPage + 1 < showPages) {
                        startPage = Math.max(1, endPage - showPages + 1);
                      }
                      
                      if (startPage > 1) {
                        pages.push(
                          <Button
                            key={1}
                            variant={1 === rfidCardsPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRfidCardsPage(1)}
                            className="w-8 h-8 p-0"
                          >
                            1
                          </Button>
                        );
                        if (startPage > 2) {
                          pages.push(<span key="dots1" className="px-2">...</span>);
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={i === rfidCardsPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRfidCardsPage(i)}
                            className="w-8 h-8 p-0"
                          >
                            {i}
                          </Button>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<span key="dots2" className="px-2">...</span>);
                        }
                        pages.push(
                          <Button
                            key={totalPages}
                            variant={totalPages === rfidCardsPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRfidCardsPage(totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => setRfidCardsPage(rfidCardsPage + 1)}
                    disabled={rfidCardsPage >= Math.ceil(rfidCardsTotal / itemsPerPage)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// System Settings Management Component  
function SystemSettingsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxWalletBalance, setMaxWalletBalance] = useState('5000.00');
  const [criticalBalanceThreshold, setCriticalBalanceThreshold] = useState('100.00');
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState('500.00');
  const [isLoading, setIsLoading] = useState(false);

  const { data: systemSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  useEffect(() => {
    if (systemSettings) {
      const maxBalance = (systemSettings as any[]).find((s: any) => s.key === 'max_wallet_balance');
      const criticalThreshold = (systemSettings as any[]).find((s: any) => s.key === 'critical_balance_threshold');
      const lowThreshold = (systemSettings as any[]).find((s: any) => s.key === 'low_balance_threshold');
      
      if (maxBalance) {
        setMaxWalletBalance(maxBalance.value);
      }
      if (criticalThreshold) {
        setCriticalBalanceThreshold(criticalThreshold.value);
      }
      if (lowThreshold) {
        setLowBalanceThreshold(lowThreshold.value);
      }
    }
  }, [systemSettings]);

  const updateSetting = async (key: string, value: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update setting');

      // Invalidate all relevant queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      await refetchSettings();

      toast({
        title: "Success",
        description: "Setting updated successfully. Changes are now active for all payment validations.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxWalletUpdate = () => {
    const value = parseFloat(maxWalletBalance);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }
    updateSetting('max_wallet_balance', value.toFixed(2));
  };

  const handleCriticalThresholdUpdate = () => {
    const value = parseFloat(criticalBalanceThreshold);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid non-negative number",
        variant: "destructive",
      });
      return;
    }
    updateSetting('critical_balance_threshold', value.toFixed(2));
  };

  const handleLowThresholdUpdate = () => {
    const value = parseFloat(lowBalanceThreshold);
    if (isNaN(value) || value < parseFloat(criticalBalanceThreshold)) {
      toast({
        title: "Invalid Value",
        description: "Low balance threshold must be greater than critical threshold",
        variant: "destructive",
      });
      return;
    }
    updateSetting('low_balance_threshold', value.toFixed(2));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wallet Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure wallet limits and restrictions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxWallet">Maximum Wallet Balance (₹)</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="maxWallet"
                  type="number"
                  value={maxWalletBalance}
                  onChange={(e) => setMaxWalletBalance(e.target.value)}
                  placeholder="5000.00"
                  step="0.01"
                  min="0"
                />
                <Button 
                  onClick={handleMaxWalletUpdate}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Updating..." : "Update Limit"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Users cannot recharge beyond this amount. Changes take effect immediately.
              </p>
            </div>
            
            <div>
              <Label htmlFor="criticalThreshold">Critical Balance Threshold (₹)</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="criticalThreshold"
                  type="number"
                  value={criticalBalanceThreshold}
                  onChange={(e) => setCriticalBalanceThreshold(e.target.value)}
                  placeholder="100.00"
                  step="0.01"
                  min="0"
                />
                <Button 
                  onClick={handleCriticalThresholdUpdate}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? "Updating..." : "Update"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Units at or below this balance will be marked as critical
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lowThreshold">Low Balance Threshold (₹)</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="lowThreshold"
                  type="number"
                  value={lowBalanceThreshold}
                  onChange={(e) => setLowBalanceThreshold(e.target.value)}
                  placeholder="500.00"
                  step="0.01"
                  min="0"
                />
                <Button 
                  onClick={handleLowThresholdUpdate}
                  disabled={isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {isLoading ? "Updating..." : "Update"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Units below this balance (but above critical) will be marked as low
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(systemSettings as any[])?.map((setting: any) => (
              <div key={setting.key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{setting.key.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">{setting.description}</div>
                </div>
                <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  {setting.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
