import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

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

interface MessagingPanelProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  onClose: () => void;
}

export function MessagingPanel({ recipientId, recipientName, recipientAvatar, onClose }: MessagingPanelProps) {
  const { user } = useAuth();
  const { lastMessage, sendTypingStart, sendTypingStop } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/conversations', recipientId],
    enabled: !!user && !!recipientId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; receiverId: string }) => {
      await apiRequest('POST', '/api/messages', messageData);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', recipientId] });
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

  // Handle real-time messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'new_message') {
      const newMessage = lastMessage.data;
      if (newMessage.sender.id === recipientId || newMessage.sender.id === user?.id) {
        queryClient.setQueryData(['/api/conversations', recipientId], (oldData: Message[]) => {
          if (!oldData) return [newMessage];
          return [...oldData, newMessage];
        });
      }
    } else if (lastMessage.type === 'typing_start' && lastMessage.data.userId === recipientId) {
      setIsTyping(true);
    } else if (lastMessage.type === 'typing_stop' && lastMessage.data.userId === recipientId) {
      setIsTyping(false);
    }
  }, [lastMessage, recipientId, queryClient, user?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      content: message.trim(),
      receiverId: recipientId,
    });
  };

  const handleTyping = (value: string) => {
    setMessage(value);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (value.trim()) {
      sendTypingStart(recipientId);
      const timeout = setTimeout(() => {
        sendTypingStop(recipientId);
      }, 2000);
      setTypingTimeout(timeout);
    } else {
      sendTypingStop(recipientId);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 h-96 shadow-lg border z-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={recipientAvatar} alt={recipientName} />
            <AvatarFallback>{recipientName[0]}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-sm">{recipientName}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6" data-testid="button-close-chat">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-full">
        <ScrollArea className="flex-1 p-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm">No messages yet</div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg: Message) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.sender.id === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">typing...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="p-3 border-t">
          <div className="flex space-x-2">
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
