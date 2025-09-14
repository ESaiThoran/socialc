// MongoDB Schemas for SocialConnect
// Data models and validation schemas for the social media platform

import { ObjectId } from 'mongodb';

// User types and interfaces
export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    push: boolean;
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
  };
  privacy: {
    showEmail: boolean;
    showOnlineStatus: boolean;
    allowMessagesfromStrangers: boolean;
  };
}

export interface User {
  _id: ObjectId;
  username: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string | null;
  coverPhoto?: string | null;
  website?: string;
  location?: string;
  dateOfBirth?: Date;
  isVerified: boolean;
  isPrivate: boolean;
  isOnline: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin' | 'moderator';
  settings: UserSettings;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

// Post types and interfaces
export interface Post {
  _id: ObjectId;
  userId: ObjectId;
  content: string;
  images: string[];
  hashtags: string[];
  mentionedUsers: ObjectId[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isDeleted: boolean;
  isPinned: boolean;
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

// Comment types and interfaces
export interface Comment {
  _id: ObjectId;
  postId: ObjectId;
  userId: ObjectId;
  parentId?: ObjectId | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  mentionedUsers: ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Like types and interfaces
export interface Like {
  _id: ObjectId;
  userId: ObjectId;
  postId?: ObjectId;
  commentId?: ObjectId;
  type: 'post' | 'comment';
  createdAt: Date;
}

// Follow types and interfaces
export interface Follow {
  _id: ObjectId;
  followerId: ObjectId;
  followingId: ObjectId;
  isAccepted: boolean;
  createdAt: Date;
}

// Message types and interfaces
export interface MessageAttachment {
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  _id: ObjectId;
  senderId: ObjectId;
  receiverId: ObjectId;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

// Notification types and interfaces
export interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  fromUserId?: ObjectId;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
  title: string;
  content: string;
  actionUrl?: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Hashtag types and interfaces
export interface Hashtag {
  _id: ObjectId;
  name: string;
  displayName: string;
  count: number;
  trending: boolean;
  description?: string;
  category?: string;
  createdAt: Date;
  lastUsed: Date;
}

// Conversation types and interfaces
export interface Conversation {
  _id: ObjectId;
  participants: ObjectId[];
  conversationId: string;
  lastMessage?: ObjectId;
  lastMessageAt: Date;
  isActive: boolean;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

// Activity types and interfaces
export interface Activity {
  _id: ObjectId;
  userId: ObjectId;
  type: 'login' | 'logout' | 'post_create' | 'post_like' | 'post_comment' | 'follow' | 'message_send';
  description: string;
  data?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Schema validation objects (keeping the original structure for validation purposes)
export const UserSchema = {
  _id: ObjectId,
  username: {
    type: 'string',
    required: true,
    unique: true,
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_]+$'
  },
  email: {
    type: 'string',
    required: false, // Leave blank for user to update
    unique: true,
    sparse: true,
    format: 'email'
  },
  password: {
    type: 'string',
    required: false, // Leave blank for user to update
    minLength: 6
  },
  firstName: {
    type: 'string',
    maxLength: 50
  },
  lastName: {
    type: 'string',
    maxLength: 50
  },
  displayName: {
    type: 'string',
    maxLength: 100
  },
  bio: {
    type: 'string',
    maxLength: 500
  },
  profilePicture: {
    type: 'string', // URL to profile image
    default: null
  },
  coverPhoto: {
    type: 'string', // URL to cover image
    default: null
  },
  website: {
    type: 'string',
    format: 'url'
  },
  location: {
    type: 'string',
    maxLength: 100
  },
  dateOfBirth: {
    type: 'date'
  },
  isVerified: {
    type: 'boolean',
    default: false
  },
  isPrivate: {
    type: 'boolean',
    default: false
  },
  isOnline: {
    type: 'boolean',
    default: false
  },
  lastActive: {
    type: 'date',
    default: Date.now
  },
  createdAt: {
    type: 'date',
    default: Date.now
  },
  updatedAt: {
    type: 'date',
    default: Date.now
  },
  role: {
    type: 'string',
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  settings: {
    type: 'object',
    properties: {
      theme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
      notifications: {
        type: 'object',
        properties: {
          email: { type: 'boolean', default: true },
          push: { type: 'boolean', default: true },
          likes: { type: 'boolean', default: true },
          comments: { type: 'boolean', default: true },
          follows: { type: 'boolean', default: true },
          messages: { type: 'boolean', default: true }
        }
      },
      privacy: {
        type: 'object',
        properties: {
          showEmail: { type: 'boolean', default: false },
          showOnlineStatus: { type: 'boolean', default: true },
          allowMessagesfromStrangers: { type: 'boolean', default: true }
        }
      }
    }
  },
  followersCount: {
    type: 'number',
    default: 0
  },
  followingCount: {
    type: 'number',
    default: 0
  },
  postsCount: {
    type: 'number',
    default: 0
  }
};

export const PostSchema = {
  _id: ObjectId,
  userId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  content: {
    type: 'string',
    required: true,
    maxLength: 2000
  },
  images: {
    type: 'array',
    items: {
      type: 'string' // URLs to images
    },
    maxItems: 4
  },
  hashtags: {
    type: 'array',
    items: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_]+$'
    }
  },
  mentionedUsers: {
    type: 'array',
    items: {
      type: ObjectId,
      ref: 'users'
    }
  },
  likesCount: {
    type: 'number',
    default: 0
  },
  commentsCount: {
    type: 'number',
    default: 0
  },
  sharesCount: {
    type: 'number',
    default: 0
  },
  viewsCount: {
    type: 'number',
    default: 0
  },
  isDeleted: {
    type: 'boolean',
    default: false
  },
  isPinned: {
    type: 'boolean',
    default: false
  },
  visibility: {
    type: 'string',
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  createdAt: {
    type: 'date',
    default: Date.now
  },
  updatedAt: {
    type: 'date',
    default: Date.now
  }
};

export const CommentSchema = {
  _id: ObjectId,
  postId: {
    type: ObjectId,
    required: true,
    ref: 'posts'
  },
  userId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  parentId: {
    type: ObjectId,
    ref: 'comments',
    default: null // For nested comments/replies
  },
  content: {
    type: 'string',
    required: true,
    maxLength: 1000
  },
  likesCount: {
    type: 'number',
    default: 0
  },
  repliesCount: {
    type: 'number',
    default: 0
  },
  mentionedUsers: {
    type: 'array',
    items: {
      type: ObjectId,
      ref: 'users'
    }
  },
  isDeleted: {
    type: 'boolean',
    default: false
  },
  createdAt: {
    type: 'date',
    default: Date.now
  },
  updatedAt: {
    type: 'date',
    default: Date.now
  }
};

export const LikeSchema = {
  _id: ObjectId,
  userId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  postId: {
    type: ObjectId,
    ref: 'posts'
  },
  commentId: {
    type: ObjectId,
    ref: 'comments'
  },
  type: {
    type: 'string',
    enum: ['post', 'comment'],
    required: true
  },
  createdAt: {
    type: 'date',
    default: Date.now
  }
};

export const FollowSchema = {
  _id: ObjectId,
  followerId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  followingId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  isAccepted: {
    type: 'boolean',
    default: true // false for private accounts
  },
  createdAt: {
    type: 'date',
    default: Date.now
  }
};

export const MessageSchema = {
  _id: ObjectId,
  senderId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  receiverId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  conversationId: {
    type: 'string',
    required: true,
    index: true
  },
  content: {
    type: 'string',
    required: true,
    maxLength: 2000
  },
  type: {
    type: 'string',
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        url: { type: 'string', required: true },
        filename: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' }
      }
    }
  },
  isRead: {
    type: 'boolean',
    default: false
  },
  readAt: {
    type: 'date'
  },
  isDeleted: {
    type: 'boolean',
    default: false
  },
  deletedAt: {
    type: 'date'
  },
  createdAt: {
    type: 'date',
    default: Date.now
  }
};

export const NotificationSchema = {
  _id: ObjectId,
  userId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  fromUserId: {
    type: ObjectId,
    ref: 'users'
  },
  type: {
    type: 'string',
    enum: ['like', 'comment', 'follow', 'mention', 'message', 'system'],
    required: true
  },
  title: {
    type: 'string',
    required: true,
    maxLength: 100
  },
  content: {
    type: 'string',
    required: true,
    maxLength: 500
  },
  actionUrl: {
    type: 'string' // URL to navigate to when notification is clicked
  },
  data: {
    type: 'object' // Additional data based on notification type
  },
  isRead: {
    type: 'boolean',
    default: false
  },
  readAt: {
    type: 'date'
  },
  createdAt: {
    type: 'date',
    default: Date.now
  }
};

export const HashtagSchema = {
  _id: ObjectId,
  name: {
    type: 'string',
    required: true,
    unique: true,
    lowercase: true,
    pattern: '^[a-zA-Z0-9_]+$'
  },
  displayName: {
    type: 'string', // Original case version
    required: true
  },
  count: {
    type: 'number',
    default: 0
  },
  trending: {
    type: 'boolean',
    default: false
  },
  description: {
    type: 'string',
    maxLength: 200
  },
  category: {
    type: 'string',
    maxLength: 50
  },
  createdAt: {
    type: 'date',
    default: Date.now
  },
  lastUsed: {
    type: 'date',
    default: Date.now
  }
};

export const ConversationSchema = {
  _id: ObjectId,
  participants: {
    type: 'array',
    items: {
      type: ObjectId,
      ref: 'users'
    },
    minItems: 2,
    maxItems: 2 // For now, only 1-on-1 conversations
  },
  conversationId: {
    type: 'string',
    required: true,
    unique: true
  },
  lastMessage: {
    type: ObjectId,
    ref: 'messages'
  },
  lastMessageAt: {
    type: 'date',
    default: Date.now
  },
  isActive: {
    type: 'boolean',
    default: true
  },
  unreadCount: {
    type: 'object', // { userId: count }
    default: {}
  },
  createdAt: {
    type: 'date',
    default: Date.now
  },
  updatedAt: {
    type: 'date',
    default: Date.now
  }
};

export const ActivitySchema = {
  _id: ObjectId,
  userId: {
    type: ObjectId,
    required: true,
    ref: 'users'
  },
  type: {
    type: 'string',
    enum: ['login', 'logout', 'post_create', 'post_like', 'post_comment', 'follow', 'message_send'],
    required: true
  },
  description: {
    type: 'string',
    required: true
  },
  data: {
    type: 'object' // Additional activity data
  },
  ipAddress: {
    type: 'string'
  },
  userAgent: {
    type: 'string'
  },
  createdAt: {
    type: 'date',
    default: Date.now
  }
};