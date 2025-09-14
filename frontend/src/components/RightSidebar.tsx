import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, UserPlus, AtSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface Activity {
  id: string;
  type: string;
  createdAt: string;
  fromUser: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface SuggestedUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  bio?: string;
}

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

export function RightSidebar() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);

  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ['/api/users/suggested', { limit: 3 }],
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });

  const followUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await apiRequest('POST', '/api/follows/toggle', { targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/suggested'] });
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
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle real-time notifications
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'notification') {
      const activity: Activity = {
        id: Date.now().toString(),
        type: lastMessage.data.type,
        createdAt: lastMessage.data.createdAt,
        fromUser: lastMessage.data.fromUser,
      };
      
      setLiveActivities(prev => [activity, ...prev.slice(0, 4)]);
    }
  }, [lastMessage]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-3 w-3 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-3 w-3 text-primary" />;
      case 'mention':
        return <AtSign className="h-3 w-3 text-secondary" />;
      default:
        return <Heart className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'like':
        return 'liked your post';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you';
      case 'comment':
        return 'commented on your post';
      default:
        return 'interacted with you';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <aside className="space-y-6">
      {/* Real-time Activity Feed */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Live Activity</h4>
            <div className="flex items-center space-x-1 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs">LIVE</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {liveActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              liveActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg transition-colors" data-testid={`activity-${activity.id}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.fromUser.profileImageUrl} alt="User" />
                    <AvatarFallback>
                      {activity.fromUser.firstName?.[0]}{activity.fromUser.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.fromUser.firstName} {activity.fromUser.lastName?.slice(0, 1)}.</span>
                      <span className="text-muted-foreground"> {getActivityText(activity.type)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.createdAt)}</p>
                  </div>
                  {getActivityIcon(activity.type)}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Who to Follow */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-4">Who to Follow</h4>
          <div className="space-y-4">
            {(suggestedUsers as any[]).map((suggestedUser: SuggestedUser) => (
              <div key={suggestedUser.id} className="flex items-center justify-between" data-testid={`suggested-user-${suggestedUser.id}`}>
                <Link href={`/profile/${suggestedUser.id}`} className="flex items-center space-x-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={suggestedUser.profileImageUrl} alt="Suggested User" />
                    <AvatarFallback>
                      {suggestedUser.firstName?.[0]}{suggestedUser.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-medium text-sm truncate">{suggestedUser.firstName} {suggestedUser.lastName}</h5>
                    <p className="text-xs text-muted-foreground truncate">@{suggestedUser.username}</p>
                    {suggestedUser.bio && (
                      <p className="text-xs text-muted-foreground truncate">{suggestedUser.bio}</p>
                    )}
                  </div>
                </Link>
                <Button
                  size="sm"
                  onClick={() => followUserMutation.mutate(suggestedUser.id)}
                  disabled={followUserMutation.isPending}
                  data-testid={`button-follow-${suggestedUser.id}`}
                >
                  Follow
                </Button>
              </div>
            ))}
          </div>
          
          <Button variant="ghost" className="w-full mt-4 text-primary text-sm" data-testid="button-show-more-suggestions">
            Show more suggestions
          </Button>
        </CardContent>
      </Card>

      {/* Direct Messages Preview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Messages</h4>
            <Button variant="ghost" size="sm" asChild data-testid="button-see-all-messages">
              <Link href="/messages" className="text-primary text-sm">
                See all
              </Link>
            </Button>
          </div>
          
          <div className="space-y-3">
            {(conversations as any[]).slice(0, 3).map((conversation: Conversation) => (
              <Link
                key={conversation.partnerId}
                href={`/messages/${conversation.partnerId}`}
                className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                data-testid={`conversation-${conversation.partnerId}`}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conversation.partner.profileImageUrl} alt="Chat Avatar" />
                    <AvatarFallback>
                      {conversation.partner.firstName?.[0]}{conversation.partner.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm truncate">
                      {conversation.partner.firstName} {conversation.partner.lastName}
                    </h5>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <Badge className="w-3 h-3 p-0 text-xs" data-testid={`unread-count-${conversation.partnerId}`}>
                    {conversation.unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
