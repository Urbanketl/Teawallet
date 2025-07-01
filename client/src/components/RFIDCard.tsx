import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Settings, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function RFIDCard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCardNumber, setNewCardNumber] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const { data: rfidCards, isLoading } = useQuery({
    queryKey: ["/api/rfid/cards"],
    enabled: isAuthenticated,
    retry: false,
  });

  const rfidCard = rfidCards?.[0]; // Show primary card

  const assignCardMutation = useMutation({
    mutationFn: async (cardNumber: string) => {
      return await apiRequest("POST", "/api/rfid/assign", { cardNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfid/cards"] });
      toast({
        title: "Success!",
        description: "RFID card assigned successfully",
      });
      setNewCardNumber("");
      setDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to assign RFID card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deactivateCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      return await apiRequest("PUT", `/api/rfid/card/${cardId}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfid/cards"] });
      toast({
        title: "Card Deactivated",
        description: "RFID card has been deactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignCard = () => {
    if (!newCardNumber.trim()) {
      toast({
        title: "Invalid Card Number",
        description: "Please enter a valid card number",
        variant: "destructive",
      });
      return;
    }
    assignCardMutation.mutate(newCardNumber.trim());
  };

  const maskCardNumber = (cardNumber: string) => {
    if (cardNumber.length <= 4) return cardNumber;
    return "**** **** " + cardNumber.slice(-4);
  };

  return (
    <Card className="shadow-material">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-tea-green" />
            <span>RFID Card</span>
          </CardTitle>
          {rfidCard && (
            <div className="w-3 h-3 bg-green-400 rounded-full" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading RFID card...</div>
        ) : !rfidCard ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No RFID card assigned</div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-tea-green hover:bg-tea-dark">
                  Assign RFID Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign RFID Card</DialogTitle>
                  <DialogDescription>
                    Enter your RFID card number to link it with your account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="Enter RFID card number"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-tea-green hover:bg-tea-dark"
                    onClick={handleAssignCard}
                    disabled={assignCardMutation.isPending}
                  >
                    {assignCardMutation.isPending ? "Assigning..." : "Assign Card"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <>
            {/* Card Visual */}
            <div className="bg-gradient-to-br from-tea-green to-tea-dark rounded-xl p-6 text-white mb-4">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-white/80 text-sm mb-1">UrbanKetl Card</div>
                  <div className="font-bold text-lg">
                    {user?.firstName} {user?.lastName}
                  </div>
                </div>
                <CreditCard className="w-6 h-6 text-white/80" />
              </div>
              <div className="space-y-2">
                <div className="text-white/80 text-xs">Card Number</div>
                <div className="font-mono text-lg tracking-wider">
                  {maskCardNumber(rfidCard.cardNumber)}
                </div>
              </div>
            </div>
            
            {/* Card Status */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge variant={rfidCard.isActive ? "default" : "destructive"}>
                  {rfidCard.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {rfidCard.lastUsed && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Used</span>
                  <span className="text-gray-900">
                    {format(new Date(rfidCard.lastUsed), 'MMM dd, h:mm a')}
                  </span>
                </div>
              )}
              {rfidCard.lastMachine && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Machine</span>
                  <span className="text-gray-900">{rfidCard.lastMachine}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => {
                console.log("Manage Card button clicked, opening dialog");
                setManageDialogOpen(true);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Card
            </Button>

            <Dialog open={manageDialogOpen} onOpenChange={(open) => {
              console.log("Dialog state changing:", open);
              setManageDialogOpen(open);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage RFID Card</DialogTitle>
                  <DialogDescription>
                    Manage your RFID card settings and view details.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="primary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="primary">Primary Card</TabsTrigger>
                    <TabsTrigger value="all">All Cards ({rfidCards?.length || 0})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="primary" className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Card Number:</span>
                        <span className="font-mono">{rfidCard.cardNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant={rfidCard.isActive ? "default" : "destructive"}>
                          {rfidCard.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {rfidCard.lastUsed && (
                        <div className="flex justify-between">
                          <span className="font-medium">Last Used:</span>
                          <span>{format(new Date(rfidCard.lastUsed), 'MMM dd, yyyy h:mm a')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Card Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(rfidCard.cardNumber);
                            toast({
                              title: "Copied!",
                              description: "Card number copied to clipboard",
                            });
                          }}
                        >
                          Copy Number
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deactivateCardMutation.mutate(rfidCard.id)}
                          disabled={deactivateCardMutation.isPending}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {deactivateCardMutation.isPending ? "Deactivating..." : "Deactivate"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="all" className="space-y-4">
                    <div className="space-y-3">
                      {rfidCards?.map((card, index) => (
                        <div key={card.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium">Card {index + 1}</span>
                              {index === 0 && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                            </div>
                            <Badge variant={card.isActive ? "default" : "destructive"}>
                              {card.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Number:</span>
                              <span className="font-mono">{card.cardNumber}</span>
                            </div>
                            {card.lastUsed && (
                              <div className="flex justify-between">
                                <span>Last Used:</span>
                                <span>{format(new Date(card.lastUsed), 'MMM dd, h:mm a')}</span>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(card.cardNumber);
                                toast({
                                  title: "Copied!",
                                  description: `Card ${index + 1} number copied`,
                                });
                              }}
                            >
                              Copy
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deactivateCardMutation.mutate(card.id)}
                              disabled={!card.isActive || deactivateCardMutation.isPending}
                            >
                              {deactivateCardMutation.isPending ? "..." : "Deactivate"}
                            </Button>
                          </div>
                        </div>
                      )) || <div className="text-center text-gray-500">No cards found</div>}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="text-sm text-gray-500 border-t pt-3">
                  <p>• Keep your cards secure and report if lost</p>
                  <p>• Cards can be used at any UrbanKetl machine</p>
                  <p>• Charges are deducted from your wallet balance</p>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
