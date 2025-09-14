import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/PostCard';
import { CalendarDays, MapPin, Link as LinkIcon, Users, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

export default function Profile() {
  const [, params] = useRoute('/profile/:userId');
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const userId = params?.userId;

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

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId && !!currentUser,
  });

  const { data: userStats } = useQuery({
    queryKey: ['/api/users', userId, 'stats'],
    enabled: !!userId && !!currentUser,
  });

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts/user', userId],
    enabled: !!userId && !!currentUser,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-4 h-4 bg-primary-foreground rounded"></div>
            </div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null; // Will redirect via useEffect
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">User Not Found</h1>
            <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser.id === profileUser.id;
  const joinDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Cover area - placeholder for future cover photo */}
              <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg mb-6 relative">
                <div className="absolute -bottom-16 left-6">
                  <Avatar className="w-32 h-32 border-4 border-background">
                    <AvatarImage src={profileUser.profileImageUrl || undefined} alt={`${profileUser.firstName} ${profileUser.lastName}`} />
                    <AvatarFallback className="text-2xl">
                      {profileUser.firstName?.[0]}{profileUser.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              <div className="pt-16 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                      {profileUser.firstName} {profileUser.lastName}
                    </h1>
                    <p className="text-muted-foreground" data-testid="text-profile-username">
                      @{profileUser.username}
                    </p>
                    
                    {profileUser.bio && (
                      <p className="mt-3 text-foreground" data-testid="text-profile-bio">
                        {profileUser.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <CalendarDays className="w-4 h-4" />
                        <span>Joined {joinDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-4">
                      <div className="text-center">
                        <div className="font-bold text-lg" data-testid="text-posts-count">
                          {userStats?.postsCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg" data-testid="text-followers-count">
                          {userStats?.followersCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg" data-testid="text-following-count">
                          {userStats?.followingCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {isOwnProfile ? (
                      <Button variant="outline" data-testid="button-edit-profile">
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="icon" data-testid="button-message-user">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button data-testid="button-follow-user">
                          Follow
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {isOwnProfile ? 'Your Posts' : 'Posts'}
              </h2>
              <Badge variant="secondary" data-testid="badge-posts-count">
                {userPosts.length} {userPosts.length === 1 ? 'post' : 'posts'}
              </Badge>
            </div>
            
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading posts...</p>
              </div>
            ) : userPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile 
                      ? "Share your first post to get started!" 
                      : "This user hasn't shared any posts yet."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {userPosts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
