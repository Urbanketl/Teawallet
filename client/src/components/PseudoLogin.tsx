import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PseudoUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  businessUnits: {
    id: string;
    name: string;
    code: string;
    role: string;
  }[];
}

export function PseudoLogin({ onLogin }: { onLogin: (userId: string) => void }) {
  const { toast } = useToast();
  
  // Fetch all users and their business unit assignments
  const { data: usersWithUnits, isLoading } = useQuery({
    queryKey: ["/api/admin/users-with-business-units"],
    retry: false,
  });

  const handlePseudoLogin = (userId: string, userName: string) => {
    onLogin(userId);
    toast({
      title: "Pseudo Login Successful",
      description: `Logged in as ${userName}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Pseudo Login - Test Business Unit User Experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Select any user to experience their dashboard view. Users with business units will see their assigned data, while unassigned users will see empty states.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usersWithUnits && Array.isArray(usersWithUnits) ? usersWithUnits
              .map((user: PseudoUser) => (
                <Card key={user.id} className="border border-gray-200 hover:border-tea-green transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">{user.email}</div>
                        
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Business Units:</p>
                          <div className="flex flex-wrap gap-1">
                            {user.businessUnits && user.businessUnits.length > 0 ? (
                              user.businessUnits.map((unit: any) => (
                                <Badge key={unit.id} variant="secondary" className="text-xs">
                                  {unit.name} ({unit.code})
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                No assignments
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handlePseudoLogin(user.id, `${user.firstName} ${user.lastName}`)}
                        className="bg-tea-green hover:bg-tea-dark"
                      >
                        Login
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            : (
              <p className="text-gray-600 col-span-full">No users found in the system</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}