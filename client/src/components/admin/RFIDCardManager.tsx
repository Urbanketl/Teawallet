import { useState } from "react";
import { useRFIDCards } from "@/hooks/useRFIDCards";
import { useBusinessUnits } from "@/hooks/useBusinessUnits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  Building2,
  X,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import Pagination from "@/components/Pagination";

interface CardFormData {
  cardNumber: string;
  cardName: string;
  businessUnitId: string;
  hardwareUid: string;
  cardType: 'desfire';
}

export default function RFIDCardManager() {
  const {
    cards,
    totalCards,
    cardsLoading,
    currentPage,
    setCurrentPage,
    cardsPerPage,
    setCardsPerPage,
    totalPages,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    businessUnitFilter,
    setBusinessUnitFilter,
    cardTypeFilter,
    setCardTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createRFIDCardMutation,
    batchCreateRFIDCardsMutation,
    updateRFIDCardMutation,
    deactivateRFIDCardMutation,
    activateRFIDCardMutation,
    assignRFIDCardMutation,
  } = useRFIDCards();

  const { allBusinessUnits } = useBusinessUnits();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [newCard, setNewCard] = useState<CardFormData>({
    cardNumber: "",
    cardName: "",
    businessUnitId: "",
    hardwareUid: "",
    cardType: "desfire",
  });
  const [batchCount, setBatchCount] = useState(10);
  const [batchBusinessUnit, setBatchBusinessUnit] = useState("");

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleCreateCard = () => {
    if (!newCard.cardNumber || !newCard.businessUnitId) {
      return;
    }

    createRFIDCardMutation.mutate(newCard, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewCard({
          cardNumber: "",
          cardName: "",
          businessUnitId: "",
          hardwareUid: "",
          cardType: "desfire",
        });
      },
    });
  };

  const handleBatchCreate = () => {
    if (!batchBusinessUnit || batchCount < 1) {
      return;
    }

    batchCreateRFIDCardsMutation.mutate({
      count: batchCount,
      businessUnitId: batchBusinessUnit,
      cardType: "desfire",
    }, {
      onSuccess: () => {
        setShowBatchDialog(false);
        setBatchCount(10);
        setBatchBusinessUnit("");
      },
    });
  };

  const handleActivateCard = (cardId: string) => {
    activateRFIDCardMutation.mutate(cardId);
  };

  const handleDeactivateCard = (cardId: string) => {
    if (confirm("Are you sure you want to deactivate this card?")) {
      deactivateRFIDCardMutation.mutate(cardId);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBusinessUnitFilter("all");
    setCardTypeFilter("all");
  };

  const getBusinessUnitName = (businessUnitId: string) => {
    const unit = allBusinessUnits.find((unit: any) => unit.id === businessUnitId);
    return unit ? unit.name : "Unassigned";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            RFID Card Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage MIFARE DESFire EV1 cards for business units
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Batch Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Batch Create RFID Cards</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="batch-count">Number of Cards *</Label>
                  <Input
                    id="batch-count"
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-business-unit">Business Unit *</Label>
                  <Select value={batchBusinessUnit} onValueChange={setBatchBusinessUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBusinessUnits.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBatchCreate}
                    disabled={batchCreateRFIDCardsMutation.isPending}
                  >
                    {batchCreateRFIDCardsMutation.isPending ? "Creating..." : `Create ${batchCount} Cards`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New RFID Card</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="card-number">Card Number *</Label>
                  <Input
                    id="card-number"
                    value={newCard.cardNumber}
                    onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                    placeholder="Enter card number"
                  />
                </div>
                <div>
                  <Label htmlFor="card-name">Card Name (Optional)</Label>
                  <Input
                    id="card-name"
                    value={newCard.cardName}
                    onChange={(e) => setNewCard({ ...newCard, cardName: e.target.value })}
                    placeholder="e.g., Office Card #1"
                  />
                </div>
                <div>
                  <Label htmlFor="hardware-uid">Hardware UID *</Label>
                  <Input
                    id="hardware-uid"
                    value={newCard.hardwareUid}
                    onChange={(e) => setNewCard({ ...newCard, hardwareUid: e.target.value })}
                    placeholder="7-byte hex UID (e.g., 04A1B2C3D4E5F6)"
                  />
                </div>
                <div>
                  <Label htmlFor="business-unit">Business Unit *</Label>
                  <Select value={newCard.businessUnitId} onValueChange={(value) => setNewCard({ ...newCard, businessUnitId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBusinessUnits.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCard}
                    disabled={createRFIDCardMutation.isPending}
                  >
                    {createRFIDCardMutation.isPending ? "Creating..." : "Create Card"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by card number, name, or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
              {totalCards} total cards
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={businessUnitFilter} onValueChange={setBusinessUnitFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Business Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Units</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {allBusinessUnits.map((unit: any) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cardTypeFilter} onValueChange={setCardTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="desfire">DESFire EV1</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all" || businessUnitFilter !== "all" || cardTypeFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RFID Cards ({totalCards})</CardTitle>
        </CardHeader>
        <CardContent>
          {cardsLoading ? (
            <div className="text-center py-8">Loading cards...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No cards found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-7 gap-4 pb-3 border-b text-sm font-medium text-gray-600">
                <button 
                  onClick={() => handleSort('cardNumber')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Card Number
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Card Name</span>
                <button 
                  onClick={() => handleSort('businessUnit')}
                  className="text-left flex items-center gap-1 hover:text-gray-900"
                >
                  Business Unit
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Type</span>
                <span>Hardware UID</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {/* Card Rows */}
              {cards.map((card: any) => (
                <div key={card.id} className="lg:grid lg:grid-cols-7 gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="font-medium">
                    {card.cardNumber}
                    <div className="text-xs text-gray-500 lg:hidden">
                      {card.cardName || "No name"}
                    </div>
                  </div>
                  <div className="hidden lg:block text-sm text-gray-600">
                    {card.cardName || "—"}
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      {getBusinessUnitName(card.businessUnitId)}
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      DESFire EV1
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-gray-600">
                    {card.hardwareUid || "—"}
                  </div>
                  <div>
                    <Badge variant={card.isActive ? "default" : "secondary"}>
                      {card.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {card.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivateCard(card.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <PowerOff className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateCard(card.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Power className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalCards}
                itemsPerPage={cardsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}