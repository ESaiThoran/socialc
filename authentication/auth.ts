// Custom Authentication System for SocialConnect
// Real-time social media platform authentication module

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoService from '../shared/mongoService.js';
import { ObjectId } from 'mongodb';
import type { User } from '../shared/mongoSchemas.js';

interface JWTPayload {
  userId: string;
  email?: string;
  username: string;
  role: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

interface RefreshTokenPayload {
  userId: string;
  tokenType: 'refresh';
  jti: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface LoginResult {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthenticationService {
  private jwtSecret: string;
  private refreshTokenSecret: string;
  private saltRounds: number = 12;
  private mongoService: typeof mongoService;

  constructor() {
    // Use provided secrets or generate development-safe defaults
    this.jwtSecret = process.env.JWT_SECRET || `dev_jwt_${Math.random().toString(36).slice(2)}`;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || `dev_refresh_${Math.random().toString(36).slice(2)}`;
    this.mongoService = mongoService;
  }
  // Hash password
  async hashPassword(password: string): Promise<string | null> {
    if (!password) return null;
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Verify password
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    if (!plainPassword || !hashedPassword) return false;
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Generate access token
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      issuer: 'socialconnect',
      audience: 'socialconnect-users'
    });
  }

  // Generate refresh token
  generateRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = {
      userId: user._id.toString(),
      tokenType: 'refresh',
      jti: this.generateTokenId() // Unique token ID for revocation
    };
    
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: '7d',
      issuer: 'socialconnect',
      audience: 'socialconnect-users'
    });
  }

  // Verify access token
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as RefreshTokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Register new user
  async register(userData: RegisterData): Promise<User> {
    const { email, password, username, firstName, lastName } = userData;
    
    // Validate required fields
    if (!username) {
      throw new Error('Username is required');
    }
    if (!email) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3 || username.length > 30) {
      throw new Error('Username must be 3-30 characters and contain only letters, numbers, and underscores');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUserByUsername = await this.mongoService.getUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error('Username already taken');
    }

    const existingUserByEmail = await this.mongoService.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);
    if (!hashedPassword) {
      throw new Error('Password hashing failed');
    }

    const newUser: Partial<User> = {
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      displayName: `${firstName || ''} ${lastName || ''}`.trim() || username,
      bio: '',
      profilePicture: null,
      coverPhoto: null,
      website: '',
      location: '',
      dateOfBirth: undefined,
      isVerified: false,
      isPrivate: false,
      isOnline: false,
      lastActive: new Date(),
      role: 'user',
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          likes: true,
          comments: true,
          follows: true,
          messages: true
        },
        privacy: {
          showEmail: false,
          showOnlineStatus: true,
          allowMessagesfromStrangers: true
        }
      },
      followersCount: 0,
      followingCount: 0,
      postsCount: 0
    };

    // Save user to database
    const savedUser = await this.mongoService.createUser(newUser);
    return savedUser;
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { email, password } = credentials;
    
    // Validate required fields
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const user = await this.mongoService.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password!);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update user's online status and last active
    await this.mongoService.updateUser(user._id.toString(), {
      isOnline: true,
      lastActive: new Date()
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes
    };
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Get user from database
    const user = await this.mongoService.getUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes
    };
  }

  // Logout user
  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Update user's online status
    await this.mongoService.updateUser(userId, {
      isOnline: false,
      lastActive: new Date()
    });

    // In a more comprehensive implementation, you would:
    // 1. Add the refresh token to a blacklist
    // 2. Remove active sessions from database
    // For now, we just update the user status
  }

  // Generate unique token ID for JWT
  private generateTokenId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Sanitize user object (remove sensitive data)
  sanitizeUser(user: User): Partial<User> {
    const sanitized = { ...user };
    delete sanitized.password;
    return sanitized;
  }

  // Password reset functionality
  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.mongoService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return true;
    }

    // Generate reset token
    const resetToken = this.generatePasswordResetToken(user);
    
    // In a real implementation, you would:
    // 1. Store reset token in database with expiry
    // 2. Send email with reset link
    // For now, we'll just log it (in production, remove this)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    return true;
  }

  // Generate password reset token
  private generatePasswordResetToken(user: User): string {
    const payload = {
      userId: user._id.toString(),
      type: 'password_reset',
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      if (!hashedPassword) {
        throw new Error('Password hashing failed');
      }

      // Update password in database
      await this.mongoService.updateUserPassword(decoded.userId, hashedPassword);
      
      return true;
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  // Change password (when user is logged in)
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    // Get user
    const user = await this.mongoService.getUserById(userId);
    if (!user || !user.password) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);
    if (!hashedPassword) {
      throw new Error('Password hashing failed');
    }

    // Update password
    await this.mongoService.updateUserPassword(userId, hashedPassword);
    
    return true;
  }

  // Validate token (for middleware)
  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = this.verifyAccessToken(token);
      const user = await this.mongoService.getUserById(decoded.userId);
      return user;
    } catch (error) {
      return null;
    }
  }
}

export default AuthenticationService;