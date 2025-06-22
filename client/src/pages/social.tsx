import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Camera, Coffee, MapPin, Clock, Plus, Share2 } from "lucide-react";
import { format } from "date-fns";

interface TeaMoment {
  id: number;
  title: string;
  description: string;
  teaType: string;
  machineId: string;
  imageUrl?: string;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export default function SocialPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMoment, setNewMoment] = useState({
    title: '',
    description: '',
    teaType: '',
    machineId: '',
    imageUrl: '',
    isPublic: true,
  });

  const { data: moments = [], isLoading } = useQuery({
    queryKey: ['/api/social/moments'],
  });

  const createMomentMutation = useMutation({
    mutationFn: async (momentData: any) => {
      console.log('Sending moment data:', momentData);
      return apiRequest('/api/social/moments', {
        method: 'POST',
        body: JSON.stringify(momentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tea moment shared successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/social/moments'] });
      setDialogOpen(false);
      setNewMoment({
        title: '',
        description: '',
        teaType: '',
        machineId: '',
        imageUrl: '',
        isPublic: true,
      });
    },
    onError: (error: any) => {
      console.error('Create moment error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to share tea moment. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const likeMomentMutation = useMutation({
    mutationFn: async (momentId: number) => {
      return apiRequest(`/api/social/moments/${momentId}/like`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/moments'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to like moment",
        variant: "destructive" 
      });
    },
  });

  const teaTypes = [
    'Masala Chai', 'Green Tea', 'Black Tea', 'Lemon Tea', 
    'Ginger Tea', 'Earl Grey', 'Oolong Tea', 'White Tea'
  ];

  const handleCreateMoment = () => {
    if (!newMoment.title.trim() || !newMoment.teaType) {
      toast({
        title: "Error",
        description: "Please fill in title and tea type",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Creating moment:', newMoment);
    createMomentMutation.mutate({
      ...newMoment,
      title: newMoment.title.trim(),
      description: newMoment.description.trim() || null,
      machineId: newMoment.machineId.trim() || null,
      imageUrl: newMoment.imageUrl.trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tea Moments</h1>
            <p className="text-gray-600">Share your tea experiences with the community</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-tea-green hover:bg-tea-dark">
                <Plus className="w-4 h-4 mr-2" />
                Share Moment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Your Tea Moment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Perfect morning tea..."
                    value={newMoment.title}
                    onChange={(e) => setNewMoment({ ...newMoment, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Share your tea experience..."
                    value={newMoment.description}
                    onChange={(e) => setNewMoment({ ...newMoment, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="teaType">Tea Type *</Label>
                  <Select value={newMoment.teaType} onValueChange={(value) => setNewMoment({ ...newMoment, teaType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tea type" />
                    </SelectTrigger>
                    <SelectContent>
                      {teaTypes.map((tea) => (
                        <SelectItem key={tea} value={tea}>{tea}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="machineId">Machine Location</Label>
                  <Input
                    id="machineId"
                    placeholder="e.g., Office Floor 2"
                    value={newMoment.machineId}
                    onChange={(e) => setNewMoment({ ...newMoment, machineId: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={newMoment.imageUrl}
                    onChange={(e) => setNewMoment({ ...newMoment, imageUrl: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={newMoment.isPublic}
                    onCheckedChange={(checked) => setNewMoment({ ...newMoment, isPublic: checked })}
                  />
                  <Label htmlFor="isPublic">Make this moment public</Label>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleCreateMoment}
                  disabled={createMomentMutation.isPending}
                >
                  {createMomentMutation.isPending ? "Sharing..." : "Share Moment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tea Moments Feed */}
        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : moments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No tea moments yet</h3>
                <p className="text-gray-500 mb-4">Be the first to share your tea experience!</p>
                <Button onClick={() => setDialogOpen(true)} className="bg-tea-green hover:bg-tea-dark">
                  Share Your First Moment
                </Button>
              </CardContent>
            </Card>
          ) : (
            moments.map((moment: TeaMoment) => (
              <Card key={moment.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={moment.user.profileImageUrl} />
                        <AvatarFallback>
                          {moment.user.firstName[0]}{moment.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">
                          {moment.user.firstName} {moment.user.lastName}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(moment.createdAt), 'MMM dd, h:mm a')}</span>
                          {moment.machineId && (
                            <>
                              <span>•</span>
                              <MapPin className="w-3 h-3" />
                              <span>{moment.machineId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-tea-green border-tea-green">
                      {moment.teaType}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{moment.title}</h3>
                    {moment.description && (
                      <p className="text-gray-600">{moment.description}</p>
                    )}
                  </div>
                  
                  {moment.imageUrl && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={moment.imageUrl} 
                        alt={moment.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => likeMomentMutation.mutate(moment.id)}
                      className="text-gray-500 hover:text-red-500"
                      disabled={likeMomentMutation.isPending}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {moment.likes} {moment.likes === 1 ? 'Like' : 'Likes'}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-tea-green"
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: moment.title,
                              text: moment.description || `Check out this tea moment: ${moment.title}`,
                              url: window.location.href,
                            });
                          } else {
                            // Fallback: Copy to clipboard
                            const shareText = `${moment.title}\n${moment.description || ''}\n${window.location.href}`;
                            await navigator.clipboard.writeText(shareText);
                            toast({
                              title: "Copied to clipboard!",
                              description: "Tea moment details copied successfully"
                            });
                          }
                        } catch (error) {
                          console.error('Share failed:', error);
                          toast({
                            title: "Share failed",
                            description: "Unable to share tea moment",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}