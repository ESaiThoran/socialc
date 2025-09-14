// MongoDB Configuration for SocialConnect
// Database configuration and connection management

import { MongoClient, Db, Collection } from 'mongodb';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  database?: string;
  error?: string;
  timestamp: string;
}

interface DatabaseStats {
  database: string;
  collections: number;
  objects: number;
  dataSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
}

export class MongoDBConfig {
  private mongoUrl: string;
  private dbName: string;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Leave MongoDB URL blank for user to update later
    this.mongoUrl = process.env.MONGODB_URL || '';
    this.dbName = process.env.DB_NAME || 'socialconnect';
  }

  // Connect to MongoDB
  async connect(): Promise<Db> {
    try {
      if (!this.mongoUrl) {
        throw new Error('MongoDB URL is not configured. Please set MONGODB_URL environment variable.');
      }

      if (this.isConnected && this.client) {
        return this.db!;
      }

      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(this.mongoUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      
      console.log(`Connected to MongoDB database: ${this.dbName}`);
      
      // Create indexes on startup
      await this.createIndexes();
      
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', (error as Error).message);
      throw error;
    }
  }

  // Disconnect from MongoDB
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.isConnected = false;
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('MongoDB disconnection error:', (error as Error).message);
    }
  }

  // Get database instance
  getDatabase(): Db {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  // Get collection
  getCollection(name: string): Collection {
    const db = this.getDatabase();
    return db.collection(name);
  }

  // Create database indexes for better performance
  async createIndexes(): Promise<void> {
    try {
      const db = this.getDatabase();

      // Users collection indexes
      await db.collection('users').createIndexes([
        { key: { username: 1 }, unique: true },
        { key: { email: 1 }, unique: true, sparse: true },
        { key: { createdAt: 1 } },
        { key: { isOnline: 1 } },
        { key: { lastActive: 1 } }
      ]);

      // Posts collection indexes
      await db.collection('posts').createIndexes([
        { key: { userId: 1 } },
        { key: { createdAt: -1 } },
        { key: { hashtags: 1 } },
        { key: { mentionedUsers: 1 } },
        { key: { isDeleted: 1 } }
      ]);

      // Comments collection indexes
      await db.collection('comments').createIndexes([
        { key: { postId: 1 } },
        { key: { userId: 1 } },
        { key: { createdAt: -1 } },
        { key: { parentId: 1 } }
      ]);

      // Likes collection indexes
      await db.collection('likes').createIndexes([
        { key: { postId: 1, userId: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { createdAt: -1 } }
      ]);

      // Follows collection indexes
      await db.collection('follows').createIndexes([
        { key: { followerId: 1, followingId: 1 }, unique: true },
        { key: { followerId: 1 } },
        { key: { followingId: 1 } },
        { key: { createdAt: -1 } }
      ]);

      // Messages collection indexes
      await db.collection('messages').createIndexes([
        { key: { senderId: 1, receiverId: 1 } },
        { key: { conversationId: 1 } },
        { key: { createdAt: -1 } },
        { key: { isRead: 1 } }
      ]);

      // Notifications collection indexes
      await db.collection('notifications').createIndexes([
        { key: { userId: 1 } },
        { key: { isRead: 1 } },
        { key: { createdAt: -1 } },
        { key: { type: 1 } }
      ]);

      // Hashtags collection indexes
      await db.collection('hashtags').createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { count: -1 } },
        { key: { trending: 1 } }
      ]);

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', (error as Error).message);
    }
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const db = this.getDatabase();
      await db.admin().ping();
      return {
        status: 'healthy',
        connected: this.isConnected,
        database: this.dbName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get database statistics
  async getStats(): Promise<DatabaseStats | null> {
    try {
      const db = this.getDatabase();
      const stats = await db.stats();
      return {
        database: this.dbName,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('Error getting database stats:', (error as Error).message);
      return null;
    }
  }
}

// Create singleton instance
const mongoConfig = new MongoDBConfig();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing MongoDB connection...');
  await mongoConfig.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing MongoDB connection...');
  await mongoConfig.disconnect();
  process.exit(0);
});

export default mongoConfig;