import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  pollOptions?: any;
  createdAt: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch comments when needed
  const { data: comments = [] } = useQuery({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/comments`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/likes/toggle', { postId: post.id });
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
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
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest('POST', '/api/comments', { postId: post.id, content });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/feed'] });
      toast({
        title: "Success",
        description: "Comment added successfully!",
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
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  const renderContent = (content: string) => {
    // Simple hashtag highlighting
    return content.split(' ').map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <Link
            key={index}
            href={`/hashtag/${word.slice(1)}`}
            className="text-primary hover:underline"
            data-testid={`link-hashtag-${word.slice(1)}`}
          >
            {word}{' '}
          </Link>
        );
      }
      return word + ' ';
    });
  };

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast({
      title: "Coming Soon",
      description: "Share feature will be available soon!",
    });
  };

  const handleBookmark = () => {
    // TODO: Implement bookmark functionality
    toast({
      title: "Coming Soon",
      description: "Bookmark feature will be available soon!",
    });
  };

  return (
    <Card className="post-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <article className="flex items-start space-x-3" data-testid={`post-${post.id}`}>
          <div className="relative">
            <Link href={`/profile/${post.author.id}`}>
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.author.profileImageUrl} alt={`${post.author.firstName} ${post.author.lastName}`} />
                <AvatarFallback>
                  {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline" data-testid={`link-author-${post.author.id}`}>
                {post.author.firstName} {post.author.lastName}
              </Link>
              
              <CheckCircle className="w-4 h-4 text-primary" />
              
              <span className="text-muted-foreground text-sm">@{post.author.username}</span>
              <span className="text-muted-foreground text-sm">•</span>
              <span className="text-muted-foreground text-sm" data-testid={`text-time-${post.id}`}>
                {formatTime(post.createdAt)}
              </span>
              
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-post-menu-${post.id}`}>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Share post</DropdownMenuItem>
                    <DropdownMenuItem>Copy link</DropdownMenuItem>
                    {user?.id === post.author.id && (
                      <>
                        <DropdownMenuItem>Edit post</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete post</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-foreground leading-relaxed" data-testid={`text-content-${post.id}`}>
                {renderContent(post.content)}
              </p>
              
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="w-full rounded-lg object-cover mt-3"
                  data-testid={`img-post-${post.id}`}
                />
              )}
              
              {post.videoUrl && (
                <video
                  src={post.videoUrl}
                  controls
                  className="w-full rounded-lg mt-3"
                  data-testid={`video-post-${post.id}`}
                />
              )}
              
              {post.pollOptions && (
                <div className="mt-3 space-y-2" data-testid={`poll-${post.id}`}>
                  {/* TODO: Render poll options */}
                  <div className="text-sm text-muted-foreground">
                    Poll feature coming soon!
                  </div>
                </div>
              )}
            </div>
            
            {/* Post Actions */}
            <div className="flex items-center justify-between text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={`flex items-center space-x-2 hover:text-red-500 group ${isLiked ? 'text-red-500' : ''}`}
                data-testid={`button-like-${post.id}`}
              >
                <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-950">
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </div>
                <span className="text-sm" data-testid={`text-likes-count-${post.id}`}>{likesCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="flex items-center space-x-2 hover:text-primary group"
                data-testid={`button-comment-${post.id}`}
              >
                <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-sm" data-testid={`text-comments-count-${post.id}`}>{post.commentsCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-2 hover:text-green-500 group"
                data-testid={`button-share-${post.id}`}
              >
                <div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-950">
                  <Repeat2 className="w-4 h-4" />
                </div>
                <span className="text-sm">Share</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className="flex items-center space-x-2 hover:text-yellow-500 group"
                data-testid={`button-bookmark-${post.id}`}
              >
                <div className="p-2 rounded-full group-hover:bg-yellow-50 dark:group-hover:bg-yellow-950">
                  <Bookmark className="w-4 h-4" />
                </div>
              </Button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="mt-4 pt-4 border-t" data-testid={`comments-section-${post.id}`}>
                {/* Comment Input */}
                <form onSubmit={handleSubmitComment} className="flex space-x-3 mb-4">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={(user as any)?.profileImageUrl} alt="Your Profile" />
                    <AvatarFallback>
                      {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex space-x-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                      data-testid={`input-comment-${post.id}`}
                    />
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || commentMutation.isPending}
                      size="sm"
                      data-testid={`button-submit-comment-${post.id}`}
                    >
                      {commentMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3" data-testid={`comments-list-${post.id}`}>
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3" data-testid={`comment-${comment.id}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author?.profileImageUrl} alt={comment.author?.firstName} />
                        <AvatarFallback>
                          {comment.author?.firstName?.[0]}{comment.author?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-sm" data-testid={`comment-author-${comment.id}`}>
                              {comment.author?.firstName} {comment.author?.lastName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm" data-testid={`comment-content-${comment.id}`}>
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>
      </CardContent>
    </Card>
  );
}
