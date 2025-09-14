import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Users, MessageCircle, Heart, TrendingUp, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Navigation */}
      <header className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Share2 className="text-primary-foreground text-sm" />
              </div>
              <span className="font-bold text-xl">SocialConnect</span>
            </div>
            
            <Button asChild data-testid="button-login">
              <a href="/api/login" className="font-medium">
                Sign In
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Share2 className="text-primary-foreground text-2xl" />
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Connect, Share, and{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Engage
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the next generation social media platform where real-time connections
            happen. Share your thoughts, discover trending content, and build meaningful
            relationships with people who matter.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-8" asChild data-testid="button-get-started">
              <a href="/api/login">
                Get Started Free
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="text-primary" />
              </div>
              <CardTitle>Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get instant notifications and see posts, comments, and messages as they happen.
                No refresh needed.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="text-secondary" />
              </div>
              <CardTitle>Direct Messaging</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect privately with friends through our real-time messaging system
                with typing indicators and read receipts.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-green-500" />
              </div>
              <CardTitle>Social Networks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Build your network by following friends and discovering new people
                with similar interests and passions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                <Heart className="text-red-500" />
              </div>
              <CardTitle>Rich Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Express yourself with likes, comments, and shares. Create polls and 
                share multimedia content with your community.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="text-yellow-500" />
              </div>
              <CardTitle>Trending Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Stay up to date with trending hashtags and discover what's popular
                in your communities and around the world.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="text-purple-500" />
              </div>
              <CardTitle>Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Share your thoughts, photos, and videos with rich text formatting,
                mentions, and hashtag support.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-24">
          <h2 className="text-3xl font-bold mb-4">Ready to join the conversation?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start connecting with friends, sharing your stories, and discovering
            what's happening in your world today.
          </p>
          <Button size="lg" className="text-lg px-8" asChild data-testid="button-join-now">
            <a href="/api/login">
              Join SocialConnect Now
            </a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <Share2 className="text-primary-foreground text-xs" />
            </div>
            <span className="text-sm">© 2024 SocialConnect. Built for real connections.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
