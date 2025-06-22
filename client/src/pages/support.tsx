import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, Plus, Search, HelpCircle, FileText, Clock, AlertCircle, CheckCircle, Camera } from "lucide-react";
import { format } from "date-fns";

interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: number;
  message: string;
  attachments: string[];
  isFromSupport: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
  };
}

interface FaqArticle {
  id: number;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpful: number;
}

export default function SupportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  });

  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['/api/support/tickets'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: messages = [], refetch: refetchMessages, error: messagesError } = useQuery({
    queryKey: [`/api/support/tickets/${selectedTicket}/messages`],
    enabled: !!selectedTicket,
    retry: 2,
    refetchInterval: selectedTicket ? 3000 : false, // Auto-refresh messages every 3 seconds when ticket is selected
  });

  // Debug logging
  if (selectedTicket && messagesError) {
    console.error('Messages fetch error:', messagesError);
  }
  if (selectedTicket) {
    console.log('Selected ticket:', selectedTicket, 'Messages:', messages);
  }

  const { data: faqArticles = [], isLoading: faqLoading } = useQuery({
    queryKey: ['/api/faq', faqCategory && faqCategory !== 'all' ? faqCategory : undefined],
    retry: false,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      console.log('Sending ticket data:', ticketData);
      try {
        const response = await apiRequest('POST', '/api/support/tickets', ticketData);
        console.log('API response:', response);
        return response;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log('Ticket created successfully:', response);
      toast({ title: "Success", description: "Support ticket created successfully!" });
      refetchTickets(); // Use refetch for immediate update
      setDialogOpen(false);
      setNewTicket({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium',
      });
    },
    onError: (error: any) => {
      console.error('Full ticket creation error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack
      });
      toast({ 
        title: "Error", 
        description: `Failed to create ticket: ${error.message || 'Unknown error'}`,
        variant: "destructive" 
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      if (!selectedTicket) {
        throw new Error('No ticket selected');
      }
      console.log('Sending message:', messageData, 'to ticket:', selectedTicket);
      return apiRequest('POST', `/api/support/tickets/${selectedTicket}/messages`, messageData);
    },
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      // Force immediate refetch of messages
      refetchMessages();
      refetchTickets();
      setNewMessage('');
      toast({ title: "Success", description: "Message sent successfully!" });
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send message",
        variant: "destructive" 
      });
    },
  });

  const incrementViewMutation = useMutation({
    mutationFn: async (articleId: number) => {
      try {
        return await apiRequest(`/api/faq/${articleId}/view`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to increment view:', error);
        // Don't show error to user for view tracking
        return null;
      }
    },
    onError: (error) => {
      // Silently handle view tracking errors
      console.error('View tracking failed:', error);
    },
  });

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

  const filteredFaq = faqArticles.filter((article: FaqArticle) =>
    article.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    article.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const faqCategories = ['general', 'technical', 'billing'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Center</h1>
          <p className="text-gray-600">Get help with your tea experience</p>
        </div>

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq" className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4" />
              <span>FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>My Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Live Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search FAQ..."
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={faqCategory} onValueChange={setFaqCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {faqCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFaq.map((article: FaqArticle) => (
                    <AccordionItem key={article.id} value={article.id.toString()}>
                      <AccordionTrigger 
                        className="text-left"
                        onClick={() => {
                          try {
                            incrementViewMutation.mutate(article.id);
                          } catch (error) {
                            console.error('View increment failed:', error);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between w-full pr-4">
                          <span>{article.question}</span>
                          <Badge variant="outline" className="ml-2">
                            {article.category}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose prose-sm max-w-none">
                          <p>{article.answer}</p>
                        </div>
                        <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                          <span>{article.views} views</span>
                          <span>•</span>
                          <span>{article.helpful} found this helpful</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Support Tickets</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-tea-green hover:bg-tea-dark">
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Fill out the form below to create a new support ticket. We'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="general">General Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Detailed description of your issue"
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => {
                        if (!newTicket.subject.trim()) {
                          toast({ 
                            title: "Error", 
                            description: "Subject is required",
                            variant: "destructive" 
                          });
                          return;
                        }
                        if (!newTicket.description.trim()) {
                          toast({ 
                            title: "Error", 
                            description: "Description is required",
                            variant: "destructive" 
                          });
                          return;
                        }
                        console.log('Creating ticket with data:', newTicket);
                        createTicketMutation.mutate(newTicket);
                      }}
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Your Tickets</h3>
                {tickets.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No support tickets yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  tickets.map((ticket: SupportTicket) => (
                    <Card 
                      key={ticket.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedTicket === ticket.id ? 'ring-2 ring-tea-green' : ''
                      }`}
                      onClick={() => setSelectedTicket(ticket.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{ticket.subject}</h4>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(ticket.status)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(ticket.createdAt), 'MMM dd')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {selectedTicket && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Conversation</h3>
                  <Card className="h-96 flex flex-col">
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((message: SupportMessage) => (
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
                                  {message.isFromSupport ? '🎧 Support' : '👤 You'}
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
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newMessage.trim() && selectedTicket) {
                              sendMessageMutation.mutate({ message: newMessage });
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            if (selectedTicket && newMessage.trim()) {
                              sendMessageMutation.mutate({ message: newMessage });
                            }
                          }}
                          disabled={!newMessage.trim() || sendMessageMutation.isPending || !selectedTicket}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Live Chat Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Live Chat Coming Soon</h3>
                  <p className="text-gray-500 mb-4">
                    Our live chat feature is currently under development. 
                    For immediate assistance, please create a support ticket.
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="bg-tea-green hover:bg-tea-dark">
                    Create Support Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}