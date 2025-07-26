import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  CreditCard, 
  Coffee, 
  Wallet, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  History,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  walletBalance: string;
  createdAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Transfer {
  id: number;
  businessUnitId: string;
  fromUserId: string | null;
  toUserId: string;
  transferredBy: string;
  reason: string;
  transferDate: string;
  assetsTransferred: {
    walletBalance: string;
    transactionCount: number;
    machineCount: number;
    rfidCardCount: number;
    transferDate: string;
  };
  businessUnit?: BusinessUnit;
  fromUser?: User;
  toUser: User;
  transferrer: User;
}

export function AdminTransferInterface() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>("");
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedHistoryUnit, setSelectedHistoryUnit] = useState<string>("");

  // Fetch business units
  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ['/api/admin/business-units']
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users', { page: 1, limit: 100 }]
  });
  const users = usersData?.users || [];

  // Fetch all transfers for history
  const { data: allTransfers = [] } = useQuery<Transfer[]>({
    queryKey: ['/api/admin/transfers']
  });

  // Fetch transfer history for selected business unit
  const { data: unitTransfers = [] } = useQuery<Transfer[]>({
    queryKey: ['/api/admin/business-units', selectedHistoryUnit, 'transfers'],
    enabled: !!selectedHistoryUnit
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ businessUnitId, newAdminId, reason }: { 
      businessUnitId: string; 
      newAdminId: string; 
      reason: string;
    }) => {
      return await apiRequest(`/api/admin/business-units/${businessUnitId}/transfer`, 'POST', {
        newAdminId,
        reason
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Transfer Successful",
        description: data.message || "Business unit ownership transferred successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-units'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transfers'] });
      setSelectedBusinessUnit("");
      setSelectedNewAdmin("");
      setTransferReason("");
      setShowConfirmDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer business unit ownership",
        variant: "destructive",
      });
    }
  });

  const handleTransfer = () => {
    if (!selectedBusinessUnit || !selectedNewAdmin || !transferReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select business unit, new admin, and provide reason",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmTransfer = () => {
    transferMutation.mutate({
      businessUnitId: selectedBusinessUnit,
      newAdminId: selectedNewAdmin,
      reason: transferReason
    });
  };

  const selectedUnit = businessUnits.find(unit => unit.id === selectedBusinessUnit);
  const selectedUser = users.find(user => user.id === selectedNewAdmin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-orange-600" />
        <div>
          <h2 className="text-2xl font-bold">Secure Admin Transfer</h2>
          <p className="text-gray-600">Transfer business unit ownership with audit trails and asset protection</p>
        </div>
      </div>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Transfer Business Unit Ownership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="business-unit">Select Business Unit to Transfer</Label>
            <select
              id="business-unit"
              value={selectedBusinessUnit}
              onChange={(e) => setSelectedBusinessUnit(e.target.value)}
              className="w-full p-3 border rounded-lg bg-white"
            >
              <option value="">Choose a business unit...</option>
              {businessUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code}) - ₹{unit.walletBalance} wallet
                </option>
              ))}
            </select>
          </div>

          {/* New Admin Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-admin">Select New Administrator</Label>
            <select
              id="new-admin"
              value={selectedNewAdmin}
              onChange={(e) => setSelectedNewAdmin(e.target.value)}
              className="w-full p-3 border rounded-lg bg-white"
              disabled={!selectedBusinessUnit}
            >
              <option value="">Choose new administrator...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Transfer Reason (Required)</Label>
            <Textarea
              id="reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Please provide a detailed reason for this transfer (e.g., role change, department restructuring, etc.)"
              className="min-h-[100px]"
              disabled={!selectedBusinessUnit}
            />
          </div>

          {/* Transfer Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleTransfer}
              disabled={!selectedBusinessUnit || !selectedNewAdmin || !transferReason.trim() || transferMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {transferMutation.isPending ? "Processing..." : "Initiate Transfer"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
            >
              <History className="h-4 w-4 mr-2" />
              View Transfer History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allTransfers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transfers recorded yet</p>
          ) : (
            <div className="space-y-3">
              {allTransfers.slice(0, 5).map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{transfer.businessUnit?.name}</Badge>
                    <div className="flex items-center gap-2">
                      {transfer.fromUser ? (
                        <>
                          <span className="text-sm">{transfer.fromUser.firstName} {transfer.fromUser.lastName}</span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Initial Assignment →</span>
                      )}
                      <span className="text-sm font-medium">{transfer.toUser.firstName} {transfer.toUser.lastName}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{format(new Date(transfer.transferDate), 'MMM dd, yyyy')}</div>
                    <div>by {transfer.transferrer.firstName} {transfer.transferrer.lastName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Confirm Business Unit Transfer
            </DialogTitle>
            <DialogDescription>
              Please review the transfer details carefully. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedUnit && selectedUser && (
            <div className="space-y-4">
              {/* Transfer Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Transfer Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Business Unit:</strong> {selectedUnit.name}
                  </div>
                  <div>
                    <strong>New Administrator:</strong> {selectedUser.firstName} {selectedUser.lastName}
                  </div>
                  <div>
                    <strong>Wallet Balance:</strong> ₹{selectedUnit.walletBalance}
                  </div>
                  <div>
                    <strong>Transfer Date:</strong> {format(new Date(), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>

              {/* Assets Being Transferred */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Assets Being Transferred
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Digital wallet & transaction history
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    All tea machines & dispensing data
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    All RFID cards & usage records
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Complete business unit management
                  </div>
                </div>
              </div>

              {/* Transfer Reason */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Transfer Reason:</h3>
                <p className="text-sm text-gray-700">{transferReason}</p>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Important Notice</h3>
                    <p className="text-sm text-red-700 mt-1">
                      This transfer will immediately change business unit ownership. The new administrator will gain full access to all assets, while the previous admin (if any) will lose access. This action is logged for audit purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={confirmTransfer}
                  disabled={transferMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {transferMutation.isPending ? "Processing..." : "Confirm Transfer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={transferMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Business Unit Transfer History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filter by Business Unit */}
            <div className="space-y-2">
              <Label>Filter by Business Unit</Label>
              <select
                value={selectedHistoryUnit}
                onChange={(e) => setSelectedHistoryUnit(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="">All Business Units</option>
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer History List */}
            <div className="space-y-3">
              {(selectedHistoryUnit ? unitTransfers : allTransfers).map((transfer) => (
                <Card key={transfer.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{transfer.businessUnit?.name || 'Unknown'}</Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(transfer.transferDate), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          {transfer.fromUser ? (
                            <>
                              <span>{transfer.fromUser.firstName} {transfer.fromUser.lastName}</span>
                              <ArrowRight className="h-4 w-4" />
                            </>
                          ) : (
                            <span className="text-gray-500">Initial Assignment →</span>
                          )}
                          <span className="font-medium">{transfer.toUser.firstName} {transfer.toUser.lastName}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <strong>Reason:</strong> {transfer.reason}
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          Transferred by: {transfer.transferrer.firstName} {transfer.transferrer.lastName}
                        </div>
                      </div>
                      
                      <div className="text-right text-sm space-y-1">
                        <div>₹{transfer.assetsTransferred.walletBalance} wallet</div>
                        <div>{transfer.assetsTransferred.transactionCount} transactions</div>
                        <div>{transfer.assetsTransferred.machineCount} machines</div>
                        <div>{transfer.assetsTransferred.rfidCardCount} cards</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(selectedHistoryUnit ? unitTransfers : allTransfers).length === 0 && (
                <p className="text-center text-gray-500 py-8">No transfer history found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}