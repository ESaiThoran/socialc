// MongoDB Service Layer for SocialConnect
// Database operations and business logic for the social media platform

import mongoConfig from './mongoConfig.js';
import { ObjectId, Db, UpdateResult, DeleteResult, InsertOneResult } from 'mongodb';
import type { 
  User, 
  Post, 
  Comment, 
  Like, 
  Follow, 
  Message, 
  Notification, 
  Hashtag,
  Conversation,
  Activity
} from './mongoSchemas.js';

interface FindOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

interface UpdateData {
  $set?: Record<string, any>;
  $inc?: Record<string, number>;
  $unset?: Record<string, any>;
  $push?: Record<string, any>;
  $pull?: Record<string, any>;
}

export class MongoService {
  private db: Db | null = null;

  // Initialize database connection
  async initialize(): Promise<Db | null> {
    try {
      this.db = await mongoConfig.connect();
      return this.db;
    } catch (error) {
      console.log('MongoDB connection not configured - running in offline mode');
      console.log('Set MONGODB_URL environment variable to enable database features');
      return null;
    }
  }

  // Generic CRUD operations
  async create(collection: string, document: Record<string, any>): Promise<any> {
    try {
      const coll = mongoConfig.getCollection(collection);
      document.createdAt = new Date();
      document.updatedAt = new Date();
      const result: InsertOneResult = await coll.insertOne(document);
      return { ...document, _id: result.insertedId };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async findById(collection: string, id: string): Promise<any | null> {
    try {
      const coll = mongoConfig.getCollection(collection);
      return await coll.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error(`Error finding document by ID in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async findOne(collection: string, query: Record<string, any>): Promise<any | null> {
    try {
      const coll = mongoConfig.getCollection(collection);
      return await coll.findOne(query);
    } catch (error) {
      console.error(`Error finding document in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async findMany(collection: string, query: Record<string, any> = {}, options: FindOptions = {}): Promise<any[]> {
    try {
      const coll = mongoConfig.getCollection(collection);
      let cursor = coll.find(query);
      
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.limit) cursor = cursor.limit(options.limit);
      if (options.skip) cursor = cursor.skip(options.skip);
      
      return await cursor.toArray();
    } catch (error) {
      console.error(`Error finding documents in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async update(collection: string, query: Record<string, any>, update: UpdateData): Promise<UpdateResult> {
    try {
      const coll = mongoConfig.getCollection(collection);
      update.$set = { ...update.$set, updatedAt: new Date() };
      const result = await coll.updateOne(query, update);
      return result;
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async updateMany(collection: string, query: Record<string, any>, update: UpdateData): Promise<UpdateResult> {
    try {
      const coll = mongoConfig.getCollection(collection);
      update.$set = { ...update.$set, updatedAt: new Date() };
      const result = await coll.updateMany(query, update);
      return result;
    } catch (error) {
      console.error(`Error updating documents in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async delete(collection: string, query: Record<string, any>): Promise<DeleteResult> {
    try {
      const coll = mongoConfig.getCollection(collection);
      const result = await coll.deleteOne(query);
      return result;
    } catch (error) {
      console.error(`Error deleting document in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  async deleteMany(collection: string, query: Record<string, any>): Promise<DeleteResult> {
    try {
      const coll = mongoConfig.getCollection(collection);
      const result = await coll.deleteMany(query);
      return result;
    } catch (error) {
      console.error(`Error deleting documents in ${collection}:`, (error as Error).message);
      throw error;
    }
  }

  // User operations
  async createUser(userData: Partial<User>): Promise<User> {
    return await this.create('users', userData);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.findById('users', userId);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.findOne('users', { username });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return await this.findOne('users', { email });
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<UpdateResult> {
    const result = await this.update('users', 
      { _id: new ObjectId(userId) }, 
      { $set: updates }
    );
    return result;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<UpdateResult> {
    return await this.update('users', 
      { _id: new ObjectId(userId) }, 
      { $set: { password: hashedPassword } }
    );
  }

  async getUserFollowers(userId: string, limit: number = 20, skip: number = 0): Promise<User[]> {
    const followers = await this.findMany('follows', 
      { followingId: new ObjectId(userId), isAccepted: true },
      { sort: { createdAt: -1 }, limit, skip }
    );
    
    const followerIds = followers.map((f: Follow) => f.followerId);
    return await this.findMany('users', { _id: { $in: followerIds } });
  }

  async getUserFollowing(userId: string, limit: number = 20, skip: number = 0): Promise<User[]> {
    const following = await this.findMany('follows', 
      { followerId: new ObjectId(userId), isAccepted: true },
      { sort: { createdAt: -1 }, limit, skip }
    );
    
    const followingIds = following.map((f: Follow) => f.followingId);
    return await this.findMany('users', { _id: { $in: followingIds } });
  }

  // Post operations
  async createPost(postData: Partial<Post>): Promise<Post> {
    const post = await this.create('posts', postData);
    
    // Update user's posts count
    await this.update('users', 
      { _id: new ObjectId(postData.userId) },
      { $inc: { postsCount: 1 } }
    );
    
    return post;
  }

  async getPostById(postId: string): Promise<Post | null> {
    return await this.findById('posts', postId);
  }

  async getUserPosts(userId: string, limit: number = 20, skip: number = 0): Promise<Post[]> {
    return await this.findMany('posts', 
      { userId: new ObjectId(userId), isDeleted: false },
      { sort: { createdAt: -1 }, limit, skip }
    );
  }

  async getFeedPosts(userIds: string[], limit: number = 20, skip: number = 0): Promise<Post[]> {
    const objectIds = userIds.map(id => new ObjectId(id));
    return await this.findMany('posts', 
      { userId: { $in: objectIds }, isDeleted: false, visibility: { $in: ['public', 'followers'] } },
      { sort: { createdAt: -1 }, limit, skip }
    );
  }

  async updatePost(postId: string, updates: Partial<Post>): Promise<UpdateResult> {
    return await this.update('posts', 
      { _id: new ObjectId(postId) }, 
      { $set: updates }
    );
  }

  async deletePost(postId: string): Promise<boolean> {
    const post = await this.getPostById(postId);
    if (post) {
      // Soft delete
      await this.update('posts', 
        { _id: new ObjectId(postId) }, 
        { $set: { isDeleted: true } }
      );
      
      // Update user's posts count
      await this.update('users', 
        { _id: post.userId },
        { $inc: { postsCount: -1 } }
      );
    }
    return true;
  }

  // Comment operations
  async createComment(commentData: Partial<Comment>): Promise<Comment> {
    const comment = await this.create('comments', commentData);
    
    // Update post's comments count
    await this.update('posts', 
      { _id: new ObjectId(commentData.postId) },
      { $inc: { commentsCount: 1 } }
    );
    
    return comment;
  }

  async getPostComments(postId: string, limit: number = 50, skip: number = 0): Promise<Comment[]> {
    return await this.findMany('comments', 
      { postId: new ObjectId(postId), isDeleted: false },
      { sort: { createdAt: -1 }, limit, skip }
    );
  }

  // Like operations
  async createLike(likeData: Partial<Like>): Promise<Like> {
    const existingLike = await this.findOne('likes', {
      userId: likeData.userId,
      [likeData.type + 'Id']: likeData[likeData.type + 'Id' as keyof Like]
    });

    if (existingLike) {
      throw new Error('Already liked');
    }

    const like = await this.create('likes', likeData);
    
    // Update likes count
    const targetCollection = likeData.type === 'post' ? 'posts' : 'comments';
    const targetId = likeData[likeData.type + 'Id' as keyof Like];
    
    await this.update(targetCollection, 
      { _id: new ObjectId(targetId as string) },
      { $inc: { likesCount: 1 } }
    );
    
    return like;
  }

  async removeLike(userId: string, targetId: string, type: 'post' | 'comment'): Promise<DeleteResult> {
    const result = await this.delete('likes', {
      userId: new ObjectId(userId),
      [type + 'Id']: new ObjectId(targetId)
    });
    
    if (result.deletedCount > 0) {
      // Update likes count
      const targetCollection = type === 'post' ? 'posts' : 'comments';
      await this.update(targetCollection, 
        { _id: new ObjectId(targetId) },
        { $inc: { likesCount: -1 } }
      );
    }
    
    return result;
  }

  // Follow operations
  async createFollow(followData: Partial<Follow>): Promise<Follow> {
    const existingFollow = await this.findOne('follows', {
      followerId: followData.followerId,
      followingId: followData.followingId
    });

    if (existingFollow) {
      throw new Error('Already following');
    }

    const follow = await this.create('follows', followData);
    
    // Update followers/following counts
    await this.update('users', 
      { _id: new ObjectId(followData.followerId) },
      { $inc: { followingCount: 1 } }
    );
    
    await this.update('users', 
      { _id: new ObjectId(followData.followingId) },
      { $inc: { followersCount: 1 } }
    );
    
    return follow;
  }

  async removeFollow(followerId: string, followingId: string): Promise<DeleteResult> {
    const result = await this.delete('follows', {
      followerId: new ObjectId(followerId),
      followingId: new ObjectId(followingId)
    });
    
    if (result.deletedCount > 0) {
      // Update followers/following counts
      await this.update('users', 
        { _id: new ObjectId(followerId) },
        { $inc: { followingCount: -1 } }
      );
      
      await this.update('users', 
        { _id: new ObjectId(followingId) },
        { $inc: { followersCount: -1 } }
      );
    }
    
    return result;
  }

  // Message operations (for real-time messaging)
  async createMessage(messageData: Partial<Message>): Promise<Message> {
    const message = await this.create('messages', messageData);
    
    // Update conversation
    await this.updateConversation(messageData.conversationId!, message);
    
    return message;
  }

  async getMessages(conversationId: string, limit: number = 50, skip: number = 0): Promise<Message[]> {
    return await this.findMany('messages', 
      { conversationId, isDeleted: false },
      { sort: { createdAt: -1 }, limit, skip }
    );
  }

  async updateConversation(conversationId: string, lastMessage: Message): Promise<void> {
    await this.update('conversations',
      { conversationId },
      { 
        $set: { 
          lastMessage: lastMessage._id,
          lastMessageAt: lastMessage.createdAt,
          updatedAt: new Date()
        }
      }
    );
  }

  // Notification operations
  async createNotification(notificationData: Partial<Notification>): Promise<Notification> {
    return await this.create('notifications', notificationData);
  }

  async getUserNotifications(userId: string, limit: number = 50, skip: number = 0): Promise<Notification[]> {
    return await this.findMany('notifications', 
      { userId: new ObjectId(userId) },
      { sort: { createdAt: -1 }, limit, skip }
    );
  }

  async markNotificationRead(notificationId: string): Promise<UpdateResult> {
    return await this.update('notifications',
      { _id: new ObjectId(notificationId) },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  // Hashtag operations
  async createOrUpdateHashtag(hashtagName: string): Promise<Hashtag> {
    const existingHashtag = await this.findOne('hashtags', { name: hashtagName.toLowerCase() });
    
    if (existingHashtag) {
      await this.update('hashtags',
        { _id: existingHashtag._id },
        { 
          $inc: { count: 1 },
          $set: { lastUsed: new Date() }
        }
      );
      return existingHashtag;
    } else {
      return await this.create('hashtags', {
        name: hashtagName.toLowerCase(),
        displayName: hashtagName,
        count: 1
      });
    }
  }

  async getTrendingHashtags(limit: number = 10): Promise<Hashtag[]> {
    return await this.findMany('hashtags', 
      {},
      { sort: { count: -1 }, limit }
    );
  }

  // Health check and statistics
  async healthCheck(): Promise<any> {
    return await mongoConfig.healthCheck();
  }

  async getStats(): Promise<any> {
    return await mongoConfig.getStats();
  }
}

// Export singleton instance
export const mongoService = new MongoService();
export default mongoService;