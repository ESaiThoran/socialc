import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, Home, Mail, Search, Share2, User } from 'lucide-react';

export function NavigationHeader() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notificationCount } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!user,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Navigate to search results
      console.log('Search:', searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Share2 className="text-primary-foreground text-sm" />
              </div>
              <span className="font-bold text-xl">SocialConnect</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search posts, people, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 bg-muted border-0 rounded-full text-sm focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-search"
              />
            </form>
          </div>

          {/* Navigation Icons */}
          <nav className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="rounded-full relative" asChild data-testid="button-home">
              <Link href="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            
            <Button variant="ghost" size="icon" className="rounded-full relative" asChild data-testid="button-notifications">
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {(notificationCount as any)?.count > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs" data-testid="text-notification-count">
                    {(notificationCount as any).count > 9 ? '9+' : (notificationCount as any).count}
                  </Badge>
                )}
              </Link>
            </Button>
            
            <Button variant="ghost" size="icon" className="rounded-full" asChild data-testid="button-messages">
              <Link href="/messages">
                <Mail className="h-5 w-5" />
              </Link>
            </Button>
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full p-1" data-testid="button-user-menu">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={(user as any)?.profileImageUrl || undefined} alt="Profile" />
                      <AvatarFallback>
                        {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${(user as any)?.id}`} className="cursor-pointer" data-testid="link-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="cursor-pointer" data-testid="link-logout">
                    Logout
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
