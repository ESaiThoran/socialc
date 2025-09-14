import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Image, Video, BarChart3, Smile } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

export function CreatePostCard() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string }) => {
      await apiRequest('POST', '/api/posts', postData);
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      toast({
        title: "Success",
        description: "Post published successfully!",
      });
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
        description: "Failed to publish post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    createPostMutation.mutate({ content });
  };

  const handleAddImage = () => {
    // TODO: Implement image upload
    toast({
      title: "Coming Soon",
      description: "Image upload feature will be available soon!",
    });
  };

  const handleAddVideo = () => {
    // TODO: Implement video upload
    toast({
      title: "Coming Soon",
      description: "Video upload feature will be available soon!",
    });
  };

  const handleAddPoll = () => {
    // TODO: Implement poll creation
    toast({
      title: "Coming Soon",
      description: "Poll creation feature will be available soon!",
    });
  };

  const handleAddEmoji = () => {
    // TODO: Implement emoji picker
    toast({
      title: "Coming Soon",
      description: "Emoji picker will be available soon!",
    });
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={(user as any).profileImageUrl || undefined} alt="Your Profile" />
            <AvatarFallback>
              {(user as any).firstName?.[0]}{(user as any).lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder={`What's on your mind, ${(user as any).firstName}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 bg-transparent text-lg placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
              data-testid="textarea-post-content"
            />
            
            {/* Post Options */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddImage}
                  className="text-muted-foreground hover:text-primary"
                  data-testid="button-add-image"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Photo
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddVideo}
                  className="text-muted-foreground hover:text-secondary"
                  data-testid="button-add-video"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddPoll}
                  className="text-muted-foreground hover:text-accent-foreground"
                  data-testid="button-add-poll"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Poll
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddEmoji}
                  className="text-muted-foreground hover:text-yellow-500"
                  data-testid="button-add-emoji"
                >
                  <Smile className="w-4 h-4 mr-2" />
                  Emoji
                </Button>
              </div>
              
              <Button
                type="submit"
                disabled={!content.trim() || createPostMutation.isPending}
                className="font-medium"
                data-testid="button-publish-post"
              >
                {createPostMutation.isPending ? 'Publishing...' : 'Post'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
