import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlusCircle, Video, PlusSquare, TrendingUp } from 'lucide-react';

export function LeftSidebar() {
  const { user } = useAuth();

  const { data: userStats } = useQuery({
    queryKey: ['/api/users', (user as any)?.id, 'stats'],
    enabled: !!user,
  });

  const { data: trendingHashtags } = useQuery({
    queryKey: ['/api/hashtags/trending'],
    select: (data: any) => data?.slice(0, 3) || [],
  });

  if (!user) return null;

  return (
    <aside className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 mx-auto border-4 border-primary">
                <AvatarImage src={(user as any).profileImageUrl || undefined} alt="Profile Picture" />
                <AvatarFallback className="text-lg">
                  {(user as any).firstName?.[0]}{(user as any).lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            </div>
            
            <h3 className="mt-3 font-semibold text-lg" data-testid="text-user-name">
              {(user as any).firstName} {(user as any).lastName}
            </h3>
            <p className="text-muted-foreground text-sm" data-testid="text-user-username">
              @{(user as any).username}
            </p>
            {(user as any).bio && (
              <p className="mt-2 text-sm" data-testid="text-user-bio">{(user as any).bio}</p>
            )}
            
            <div className="flex justify-center space-x-4 mt-4 text-sm">
              <div className="text-center">
                <div className="font-semibold" data-testid="text-followers-count">
                  {(userStats as any)?.followersCount || 0}
                </div>
                <div className="text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-semibold" data-testid="text-following-count">
                  {(userStats as any)?.followingCount || 0}
                </div>
                <div className="text-muted-foreground">Following</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" data-testid="button-create-post">
              <PlusCircle className="mr-3 h-4 w-4 text-primary" />
              Create Post
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="button-go-live">
              <Video className="mr-3 h-4 w-4 text-secondary" />
              Go Live
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="button-add-story">
              <PlusSquare className="mr-3 h-4 w-4 text-accent-foreground" />
              Add Story
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trending Hashtags */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Trending Now</h4>
          <div className="space-y-2">
            {trendingHashtags?.map((hashtag: any) => (
              <Link
                key={hashtag.id}
                href={`/hashtag/${hashtag.name}`}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                data-testid={`link-hashtag-${hashtag.name}`}
              >
                <div>
                  <div className="font-medium text-primary">#{hashtag.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {hashtag.postsCount} posts
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
