import {
  users,
  posts,
  comments,
  likes,
  follows,
  messages,
  notifications,
  hashtags,
  postHashtags,
  type User,
  type UpsertUser,
  type InsertPost,
  type Post,
  type InsertComment,
  type Comment,
  type Like,
  type Follow,
  type InsertMessage,
  type Message,
  type InsertNotification,
  type Notification,
  type Hashtag,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, ilike, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;

  // Post operations
  createPost(authorId: string, post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getFeedPosts(userId: string, limit?: number, offset?: number): Promise<any[]>;
  getUserPosts(userId: string, limit?: number, offset?: number): Promise<any[]>;
  updatePost(id: string, authorId: string, data: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string, authorId: string): Promise<boolean>;
  searchPosts(query: string, limit?: number): Promise<any[]>;

  // Comment operations
  createComment(authorId: string, comment: InsertComment): Promise<Comment>;
  getPostComments(postId: string): Promise<any[]>;
  deleteComment(id: string, authorId: string): Promise<boolean>;

  // Like operations
  toggleLike(userId: string, postId?: string, commentId?: string): Promise<boolean>;
  getPostLikes(postId: string): Promise<Like[]>;
  isLikedByUser(userId: string, postId?: string, commentId?: string): Promise<boolean>;

  // Follow operations
  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<any[]>;
  getFollowing(userId: string): Promise<any[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getSuggestedUsers(userId: string, limit?: number): Promise<User[]>;

  // Message operations
  createMessage(senderId: string, message: InsertMessage): Promise<Message>;
  getConversation(userId1: string, userId2: string, limit?: number): Promise<any[]>;
  getUserConversations(userId: string): Promise<any[]>;
  markMessagesAsRead(userId: string, fromUserId: string): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<any[]>;
  markNotificationAsRead(id: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Hashtag operations
  getOrCreateHashtag(name: string): Promise<Hashtag>;
  linkPostToHashtags(postId: string, hashtagNames: string[]): Promise<void>;
  getTrendingHashtags(limit?: number): Promise<any[]>;
  getHashtagPosts(hashtagName: string, limit?: number): Promise<any[]>;

  // Activity operations
  getLiveActivity(userId: string, limit?: number): Promise<any[]>;
  getStats(userId: string): Promise<{
    postsCount: number;
    followersCount: number;
    followingCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Post operations
  async createPost(authorId: string, post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values({ ...post, authorId })
      .returning();
    return newPost;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getFeedPosts(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const feedPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        pollOptions: posts.pollOptions,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
        isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.postId} = ${posts.id} AND ${likes.userId} = ${userId})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(follows, and(eq(follows.followingId, posts.authorId), eq(follows.followerId, userId)))
      .where(or(eq(posts.authorId, userId), eq(follows.followerId, userId)))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return feedPosts;
  }

  async getUserPosts(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const userPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        pollOptions: posts.pollOptions,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return userPosts;
  }

  async updatePost(id: string, authorId: string, data: Partial<Post>): Promise<Post | undefined> {
    const [updatedPost] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();
    return updatedPost;
  }

  async deletePost(id: string, authorId: string): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));
    return result.rowCount! > 0;
  }

  async searchPosts(query: string, limit = 20): Promise<any[]> {
    const searchResults = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(ilike(posts.content, `%${query}%`))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return searchResults;
  }

  // Comment operations
  async createComment(authorId: string, comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({ ...comment, authorId })
      .returning();
    return newComment;
  }

  async getPostComments(postId: string): Promise<any[]> {
    const postComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.commentId} = ${comments.id})`,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return postComments;
  }

  async deleteComment(id: string, authorId: string): Promise<boolean> {
    const result = await db
      .delete(comments)
      .where(and(eq(comments.id, id), eq(comments.authorId, authorId)));
    return result.rowCount! > 0;
  }

  // Like operations
  async toggleLike(userId: string, postId?: string, commentId?: string): Promise<boolean> {
    const existingLike = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          postId ? eq(likes.postId, postId) : sql`${likes.postId} IS NULL`,
          commentId ? eq(likes.commentId, commentId) : sql`${likes.commentId} IS NULL`
        )
      );

    if (existingLike.length > 0) {
      await db.delete(likes).where(eq(likes.id, existingLike[0].id));
      return false; // unliked
    } else {
      await db.insert(likes).values({
        userId,
        postId: postId || null,
        commentId: commentId || null,
      });
      return true; // liked
    }
  }

  async getPostLikes(postId: string): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.postId, postId));
  }

  async isLikedByUser(userId: string, postId?: string, commentId?: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          postId ? eq(likes.postId, postId) : sql`${likes.postId} IS NULL`,
          commentId ? eq(likes.commentId, commentId) : sql`${likes.commentId} IS NULL`
        )
      );
    return !!like;
  }

  // Follow operations
  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false;

    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));

    if (existingFollow) {
      await db.delete(follows).where(eq(follows.id, existingFollow.id));
      return false; // unfollowed
    } else {
      await db.insert(follows).values({ followerId, followingId });
      return true; // followed
    }
  }

  async getFollowers(userId: string): Promise<any[]> {
    const followers = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return followers;
  }

  async getFollowing(userId: string): Promise<any[]> {
    const following = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return following;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return !!follow;
  }

  async getSuggestedUsers(userId: string, limit = 5): Promise<User[]> {
    // Get users that current user is not following and exclude self
    const suggested = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} != ${userId}`,
          sql`${users.id} NOT IN (SELECT ${follows.followingId} FROM ${follows} WHERE ${follows.followerId} = ${userId})`
        )
      )
      .limit(limit);

    return suggested;
  }

  // Message operations
  async createMessage(senderId: string, message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({ ...message, senderId })
      .returning();
    return newMessage;
  }

  async getConversation(userId1: string, userId2: string, limit = 50): Promise<any[]> {
    const conversation = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        isRead: messages.isRead,
        sender: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return conversation.reverse();
  }

  async getUserConversations(userId: string): Promise<any[]> {
    const conversations = await db
      .select({
        partnerId: sql<string>`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`,
        lastMessage: messages.content,
        lastMessageTime: messages.createdAt,
        isRead: messages.isRead,
        partner: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        unreadCount: sql<number>`(SELECT COUNT(*) FROM ${messages} m WHERE m.sender_id != ${userId} AND m.receiver_id = ${userId} AND m.is_read = false AND (m.sender_id = ${users.id} OR m.receiver_id = ${users.id}))`,
      })
      .from(messages)
      .leftJoin(
        users,
        sql`${users.id} = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`
      )
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .groupBy(
        sql`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`,
        users.id,
        users.username,
        users.firstName,
        users.lastName,
        users.profileImageUrl,
        messages.content,
        messages.createdAt,
        messages.isRead
      )
      .orderBy(desc(messages.createdAt));

    return conversations;
  }

  async markMessagesAsRead(userId: string, fromUserId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.receiverId, userId), eq(messages.senderId, fromUserId)));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: string, limit = 20): Promise<any[]> {
    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        content: notifications.content,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        fromUser: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return userNotifications;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.count;
  }

  // Hashtag operations
  async getOrCreateHashtag(name: string): Promise<Hashtag> {
    const [existingHashtag] = await db
      .select()
      .from(hashtags)
      .where(eq(hashtags.name, name.toLowerCase()));

    if (existingHashtag) {
      return existingHashtag;
    }

    const [newHashtag] = await db
      .insert(hashtags)
      .values({ name: name.toLowerCase() })
      .returning();
    return newHashtag;
  }

  async linkPostToHashtags(postId: string, hashtagNames: string[]): Promise<void> {
    for (const name of hashtagNames) {
      const hashtag = await this.getOrCreateHashtag(name);
      await db.insert(postHashtags).values({ postId, hashtagId: hashtag.id });
    }
  }

  async getTrendingHashtags(limit = 10): Promise<any[]> {
    const trending = await db
      .select({
        id: hashtags.id,
        name: hashtags.name,
        postsCount: sql<number>`(SELECT COUNT(*) FROM ${postHashtags} WHERE ${postHashtags.hashtagId} = ${hashtags.id})`,
      })
      .from(hashtags)
      .orderBy(sql`posts_count DESC`)
      .limit(limit);

    return trending;
  }

  async getHashtagPosts(hashtagName: string, limit = 20): Promise<any[]> {
    const hashtagPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .leftJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(eq(hashtags.name, hashtagName.toLowerCase()))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return hashtagPosts;
  }

  // Activity operations
  async getLiveActivity(userId: string, limit = 20): Promise<any[]> {
    const activities = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        createdAt: notifications.createdAt,
        fromUser: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return activities;
  }

  async getStats(userId: string): Promise<{
    postsCount: number;
    followersCount: number;
    followingCount: number;
  }> {
    const [postsCount] = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const [followersCount] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingCount] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return {
      postsCount: postsCount.count,
      followersCount: followersCount.count,
      followingCount: followingCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
