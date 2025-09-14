import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreatePostCard } from './CreatePostCard';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function MainFeed() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/posts/feed', limit, offset],
    queryFn: async () => {
      const url = `/api/posts/feed?limit=${limit}&offset=${offset}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Handle real-time updates
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'new_post':
        // Invalidate and refetch the entire feed to show new posts
        queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
        break;
        
      case 'new_comment':
        // Invalidate to refetch with updated comment counts
        queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
        break;
        
      case 'like_update':
        // Invalidate to refetch with updated like counts
        queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
        break;
    }
  }, [lastMessage, queryClient, user?.id]);

  const loadMorePosts = () => {
    setOffset(prev => prev + limit);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to view your feed.</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <CreatePostCard />
      
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Loading your feed...</p>
          </div>
        ) : (posts as any[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No posts in your feed yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Follow some users to see their posts here!
            </p>
          </div>
        ) : (
          <>
            {(posts as any[]).map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
            
            <div className="text-center py-6">
              <Button 
                variant="outline" 
                onClick={loadMorePosts}
                data-testid="button-load-more"
              >
                Load More Posts
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
