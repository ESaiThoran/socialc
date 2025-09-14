import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface Conversation {
  partnerId: string;
  lastMessage: string;
  lastMessageTime: string;
  isRead: boolean;
  unreadCount: number;
  partner: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export default function Messages() {
  const [, params] = useRoute('/messages/:userId?');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { lastMessage, sendTypingStart, sendTypingStop } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(params?.userId || null);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });

  const { data: selectedConversation = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/conversations', selectedUserId],
    enabled: !!user && !!selectedUserId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; receiverId: string }) => {
      await apiRequest('POST', '/api/messages', messageData);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle real-time messages and typing indicators
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'new_message':
        const newMessage = lastMessage.data;
        if (selectedUserId && (newMessage.sender.id === selectedUserId || newMessage.sender.id === user?.id)) {
          queryClient.setQueryData(['/api/conversations', selectedUserId], (oldData: Message[]) => {
            if (!oldData) return [newMessage];
            return [...oldData, newMessage];
          });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        break;
        
      case 'typing_start':
        if (lastMessage.data.userId === selectedUserId) {
          setTypingUsers(prev => new Set(prev).add(lastMessage.data.userId));
        }
        break;
        
      case 'typing_stop':
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastMessage.data.userId);
          return newSet;
        });
        break;
    }
  }, [lastMessage, selectedUserId, queryClient, user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUserId) return;

    sendMessageMutation.mutate({
      content: message.trim(),
      receiverId: selectedUserId,
    });
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (selectedUserId) {
      if (value.trim()) {
        sendTypingStart(selectedUserId);
      } else {
        sendTypingStop(selectedUserId);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getSelectedUser = () => {
    if (!selectedUserId) return null;
    const conversation = conversations.find((c: Conversation) => c.partnerId === selectedUserId);
    return conversation?.partner;
  };

  const filteredConversations = conversations.filter((conversation: Conversation) =>
    conversation.partner.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.partner.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.partner.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-4 h-4 bg-primary-foreground rounded"></div>
            </div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  const selectedUser = getSelectedUser();

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Conversations List */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Messages</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-conversations"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading conversations...
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredConversations.map((conversation: Conversation) => (
                        <button
                          key={conversation.partnerId}
                          onClick={() => setSelectedUserId(conversation.partnerId)}
                          className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                            selectedUserId === conversation.partnerId ? 'bg-accent' : ''
                          }`}
                          data-testid={`conversation-${conversation.partnerId}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={conversation.partner.profileImageUrl} alt={`${conversation.partner.firstName} ${conversation.partner.lastName}`} />
                                <AvatarFallback>
                                  {conversation.partner.firstName?.[0]}{conversation.partner.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium truncate">
                                  {conversation.partner.firstName} {conversation.partner.lastName}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(conversation.lastMessageTime)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage}
                              </p>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge className="w-5 h-5 p-0 text-xs flex items-center justify-center">
                                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8">
            <Card className="h-full flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.profileImageUrl} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                        <AvatarFallback>
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold" data-testid="text-chat-partner-name">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[calc(100vh-20rem)] p-4">
                      {messagesLoading ? (
                        <div className="text-center text-muted-foreground">Loading messages...</div>
                      ) : selectedConversation.length === 0 ? (
                        <div className="text-center text-muted-foreground">
                          Start a conversation with {selectedUser.firstName}!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedConversation.map((msg: Message) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${msg.id}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  msg.sender.id === user.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs mt-1 opacity-70">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Typing Indicator */}
                          {typingUsers.has(selectedUserId) && (
                            <div className="flex justify-start">
                              <div className="bg-muted px-4 py-2 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                  </div>
                                  <span className="text-xs text-muted-foreground">typing...</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSubmit} className="flex space-x-2">
                      <Input
                        value={message}
                        onChange={(e) => handleTyping(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sendMessageMutation.isPending}
                        className="flex-1"
                        data-testid="input-message"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the list to start messaging.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
