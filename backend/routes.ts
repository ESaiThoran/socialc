import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ObjectId } from "mongodb";
import mongoService from "../shared/mongoService.js";
import authRoutes from "../authentication/routes.js";
import { AuthMiddleware } from "../authentication/middleware.js";
import { z } from "zod";

interface WebSocketClient extends WebSocket {
  userId?: string;
}

const connectedClients = new Map<string, WebSocketClient>();
let authMiddleware: AuthMiddleware;

function getAuthMiddleware(): AuthMiddleware {
  if (!authMiddleware) {
    authMiddleware = new AuthMiddleware();
  }
  return authMiddleware;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize MongoDB connection (graceful failure for development)
  const dbConnected = await mongoService.initialize();
  if (!dbConnected) {
    console.log('Running without database - authentication and data features disabled');
  }

  // Database offline middleware for protected routes
  const checkDatabaseConnection = (req: any, res: any, next: any) => {
    if (!dbConnected) {
      return res.status(503).json({ 
        message: "Database offline - feature not available",
        hint: "Set MONGODB_URL environment variable to enable database features"
      });
    }
    next();
  };

  // Auth routes (with /api prefix)
  app.use('/api', authRoutes);

  // Protected API routes
  app.use('/api', checkDatabaseConnection);
  app.use('/api', (req, res, next) => getAuthMiddleware().authenticate()(req, res, next));

  // User routes
  app.get('/api/users/:id', async (req: any, res) => {
    try {
      const user = await mongoService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/users/profile', async (req: any, res) => {
    try {
      const userId = req.userId;
      const updates = req.body;

      // Validate updates
      const allowedFields = ['firstName', 'lastName', 'bio', 'website', 'location', 'profilePicture'];
      const filteredUpdates: any = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = value;
        }
      }

      const result = await mongoService.updateUser(userId, filteredUpdates);
      
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await mongoService.getUserById(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/:id/followers', async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const followers = await mongoService.getUserFollowers(
        req.params.id, 
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(followers);
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  app.get('/api/users/:id/following', async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const following = await mongoService.getUserFollowing(
        req.params.id,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  // Post routes
  app.post('/api/posts', async (req: any, res) => {
    try {
      const userId = req.userId;
      const { content, images, hashtags } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Post content is required" });
      }

      const postData = {
        userId,
        content: content.trim(),
        images: images || [],
        hashtags: hashtags || [],
        mentionedUsers: [], // Extract from content if needed
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const post = await mongoService.createPost(postData);
      
      // Broadcast to connected clients for real-time updates
      broadcastToClients('new_post', post);
      
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get('/api/posts', async (req: any, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const userId = req.userId;

      // Get user's following list to create feed
      const following = await mongoService.getUserFollowing(userId, 1000); // Get all following
      const followingIds = following.map((f: any) => f._id.toString());
      followingIds.push(userId); // Include user's own posts

      const posts = await mongoService.getFeedPosts(
        followingIds,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await mongoService.getPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.delete('/api/posts/:id', async (req: any, res) => {
    try {
      const postId = req.params.id;
      const userId = req.userId;

      // Check if user owns the post
      const post = await mongoService.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }

      await mongoService.deletePost(postId);
      
      // Broadcast to connected clients
      broadcastToClients('post_deleted', { postId });
      
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Comment routes
  app.post('/api/posts/:id/comments', async (req: any, res) => {
    try {
      const postId = req.params.id;
      const userId = req.userId;
      const { content, parentId } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const commentData = {
        postId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const comment = await mongoService.createComment(commentData);
      
      // Broadcast to connected clients
      broadcastToClients('new_comment', comment);
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const comments = await mongoService.getPostComments(
        req.params.id,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Like routes
  app.post('/api/posts/:id/like', async (req: any, res) => {
    try {
      const postId = req.params.id;
      const userId = req.userId;

      const likeData = {
        userId,
        postId,
        type: 'post' as const,
        createdAt: new Date()
      };

      const like = await mongoService.createLike(likeData);
      
      // Broadcast to connected clients
      broadcastToClients('post_liked', { postId, userId });
      
      res.status(201).json(like);
    } catch (error) {
      if (error instanceof Error && error.message === 'Already liked') {
        return res.status(409).json({ message: "Post already liked" });
      }
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.delete('/api/posts/:id/like', async (req: any, res) => {
    try {
      const postId = req.params.id;
      const userId = req.userId;

      const result = await mongoService.removeLike(userId, postId, 'post');
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Like not found" });
      }
      
      // Broadcast to connected clients
      broadcastToClients('post_unliked', { postId, userId });
      
      res.json({ message: "Post unliked successfully" });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  // Follow routes
  app.post('/api/users/:id/follow', async (req: any, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.userId;

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const followData = {
        followerId,
        followingId,
        isAccepted: true, // For now, auto-accept follows
        createdAt: new Date()
      };

      const follow = await mongoService.createFollow(followData);
      
      // Create notification for the followed user
      await mongoService.createNotification({
        userId: followingId,
        fromUserId: followerId,
        type: 'follow',
        title: 'New Follower',
        content: 'started following you',
        createdAt: new Date()
      });
      
      // Broadcast to connected clients
      broadcastToClients('new_follow', { followerId, followingId });
      
      res.status(201).json(follow);
    } catch (error) {
      if (error instanceof Error && error.message === 'Already following') {
        return res.status(409).json({ message: "Already following this user" });
      }
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete('/api/users/:id/follow', async (req: any, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.userId;

      const result = await mongoService.removeFollow(followerId, followingId);
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Follow relationship not found" });
      }
      
      // Broadcast to connected clients
      broadcastToClients('unfollow', { followerId, followingId });
      
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Messages routes (real-time messaging)
  app.get('/api/messages/:conversationId', async (req: any, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const messages = await mongoService.getMessages(
        req.params.conversationId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Notification routes
  app.get('/api/notifications', async (req: any, res) => {
    try {
      const userId = req.userId;
      const { limit = 50, offset = 0 } = req.query;
      const notifications = await mongoService.getUserNotifications(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      await mongoService.markNotificationRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Hashtag routes
  app.get('/api/hashtags/trending', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const hashtags = await mongoService.getTrendingHashtags(parseInt(limit as string));
      res.json(hashtags);
    } catch (error) {
      console.error("Error fetching trending hashtags:", error);
      res.status(500).json({ message: "Failed to fetch trending hashtags" });
    }
  });

  // WebSocket setup for real-time features - scoped to /ws path to avoid Vite HMR conflicts
  const server = createServer(app);
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate') {
          try {
            const authService = new (await import('../authentication/auth')).default();
            const decoded = authService.verifyAccessToken(data.token);
            ws.userId = decoded.userId;
            connectedClients.set(decoded.userId, ws);
            console.log(`User ${decoded.userId} connected via WebSocket`);
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              success: true
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'authentication_error',
              message: 'Invalid token'
            }));
          }
        } else if (data.type === 'send_message' && ws.userId) {
          // Handle real-time messaging
          const messageData = {
            senderId: new ObjectId(ws.userId),
            receiverId: new ObjectId(data.receiverId),
            conversationId: data.conversationId,
            content: data.content,
            type: data.messageType || 'text',
            createdAt: new Date()
          };

          const message = await mongoService.createMessage(messageData);
          
          // Send to receiver if connected
          const receiverWs = connectedClients.get(data.receiverId);
          if (receiverWs) {
            receiverWs.send(JSON.stringify({
              type: 'new_message',
              data: message
            }));
          }
          
          // Confirm to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            data: message
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected`);
      }
    });
  });

  // Helper function to broadcast to connected clients
  function broadcastToClients(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const dbHealth = await mongoService.healthCheck();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        connectedClients: connectedClients.size
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return server;
}