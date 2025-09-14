// Authentication Routes for SocialConnect
// RESTful API endpoints for user authentication and management

import express, { Request, Response, Router } from 'express';
import AuthenticationService from './auth.js';
import { AuthMiddleware } from './middleware.js';
import mongoService from '../shared/mongoService.js';

const router: Router = express.Router();

// Lazy initialization of services to avoid environment variable issues at import time
let authService: AuthenticationService;
let authMiddleware: AuthMiddleware;

function getAuthService(): AuthenticationService {
  if (!authService) {
    authService = new AuthenticationService();
  }
  return authService;
}

function getAuthMiddleware(): AuthMiddleware {
  if (!authMiddleware) {
    authMiddleware = new AuthMiddleware();
  }
  return authMiddleware;
}

// Apply CORS and rate limiting to all auth routes
router.use((req, res, next) => getAuthMiddleware().corsAuth()(req, res, next));
router.use('/auth', (req, res, next) => getAuthMiddleware().rateLimitAuth()(req, res, next));

// User registration
router.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, firstName, lastName } = req.body;
    
    // Registration includes validation and database operations
    const newUser = await getAuthService().register({
      email,
      password,
      username,
      firstName,
      lastName
    });

    // Send verification email after successful registration
    if (email) {
      try {
        const emailService = (await import('../shared/emailService')).default;
        await emailService.sendVerificationEmail(email, username);
        console.log(`Verification email sent to ${email}`);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail registration if email sending fails
      }
    }

    const accessToken = getAuthService().generateAccessToken(newUser);
    const refreshToken = getAuthService().generateRefreshToken(newUser);

    res.status(201).json({
      success: true,
      message: email ? 'User registered successfully. Please check your email for verification code.' : 'User registered successfully',
      user: getAuthService().sanitizeUser(newUser),
      accessToken,
      refreshToken,
      expiresIn: 900,
      needsEmailVerification: !!email
    });

  } catch (error) {
    let statusCode = 500;
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('Username already taken') || errorMessage.includes('Email already registered')) {
      statusCode = 409;
    } else if (errorMessage.includes('required') || errorMessage.includes('Invalid') || errorMessage.includes('must be')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage
    });
  }
});

// User login
router.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Login includes database lookup and validation
    const loginResult = await getAuthService().login({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      ...loginResult
    });

  } catch (error) {
    let statusCode = 401;
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('required')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage
    });
  }
});

// Refresh token
router.post('/auth/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
      return;
    }

    const result = await getAuthService().refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...result
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: (error as Error).message
    });
  }
});

// User logout
router.post('/auth/logout', (req, res, next) => getAuthMiddleware().authenticate()(req, res, next), async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = req.userId!;

    await getAuthService().logout(userId, refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: (error as Error).message
    });
  }
});

// Get current user profile
router.get('/auth/me', (req, res, next) => getAuthMiddleware().authenticate()(req, res, next), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    
    const user = await mongoService.getUserById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      user: getAuthService().sanitizeUser(user)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: (error as Error).message
    });
  }
});

// Update user profile
router.put('/auth/profile', (req, res, next) => getAuthMiddleware().authenticate()(req, res, next), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const updates = { ...req.body };

    // Remove sensitive fields that shouldn't be updated this way
    delete updates._id;
    delete updates.id;
    delete updates.password;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.role;
    delete updates.isVerified;
    delete updates.followersCount;
    delete updates.followingCount;
    delete updates.postsCount;

    // Validate email format if being updated
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }
      
      // Check if email is already taken by another user
      const existingUser = await mongoService.getUserByEmail(updates.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        res.status(409).json({
          success: false,
          message: 'Email already taken'
        });
        return;
      }
    }

    // Validate username format if being updated
    if (updates.username) {
      if (!/^[a-zA-Z0-9_]+$/.test(updates.username) || updates.username.length < 3 || updates.username.length > 30) {
        res.status(400).json({
          success: false,
          message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores'
        });
        return;
      }
      
      // Check if username is already taken by another user
      const existingUser = await mongoService.getUserByUsername(updates.username);
      if (existingUser && existingUser._id.toString() !== userId) {
        res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
        return;
      }
    }

    await mongoService.updateUser(userId, updates);
    const updatedUser = await mongoService.getUserById(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: getAuthService().sanitizeUser(updatedUser!)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: (error as Error).message
    });
  }
});

// Update password
router.put('/auth/password', (req, res, next) => getAuthMiddleware().authenticate()(req, res, next), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password is required'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
      return;
    }

    const user = await mongoService.getUserById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify current password
    if (!currentPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
      return;
    }

    const isValidCurrentPassword = await getAuthService().verifyPassword(currentPassword, user.password!);
    if (!isValidCurrentPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const hashedPassword = await getAuthService().hashPassword(newPassword);
    if (!hashedPassword) {
      res.status(500).json({
        success: false,
        message: 'Password hashing failed'
      });
      return;
    }
    
    // Update password in database
    await mongoService.updateUserPassword(userId, hashedPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: (error as Error).message
    });
  }
});

// Verify email with 6-digit OTP code
router.post('/auth/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
      return;
    }

    const emailService = (await import('../shared/emailService')).default;
    const isValidOTP = await emailService.verifyOTP(email, code.toString(), 'verification');
    
    if (!isValidOTP) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
      return;
    }

    // Find and update user as verified in database
    const user = await mongoService.getUserByEmail(email);
    if (user) {
      await mongoService.updateUser(user._id.toString(), { isVerified: true });
    }
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: (error as Error).message
    });
  }
});

// Resend verification email
router.post('/auth/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Check if user exists
    const user = await mongoService.getUserByEmail(email);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
      return;
    }

    const emailService = (await import('../shared/emailService')).default;
    const sent = await emailService.resendOTP(email, 'verification', user.username);
    
    if (!sent) {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: (error as Error).message
    });
  }
});

// Request password reset with 6-digit OTP
router.post('/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Check if user exists (but don't reveal if they don't for security)
    const user = await mongoService.getUserByEmail(email);
    if (user) {
      const emailService = (await import('../shared/emailService')).default;
      await emailService.sendPasswordResetOTP(email);
    }
    
    // Always return success to not reveal if email exists
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: (error as Error).message
    });
  }
});

// Verify password reset OTP and reset password
router.post('/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
      return;
    }

    // Verify OTP
    const emailService = (await import('../shared/emailService')).default;
    const isValidOTP = await emailService.verifyOTP(email, code.toString(), 'password_reset');
    
    if (!isValidOTP) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
      return;
    }

    // Find user and reset password
    const user = await mongoService.getUserByEmail(email);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Hash new password and update
    const hashedPassword = await getAuthService().hashPassword(newPassword);
    if (!hashedPassword) {
      res.status(500).json({
        success: false,
        message: 'Password hashing failed'
      });
      return;
    }

    await mongoService.updateUserPassword(user._id.toString(), hashedPassword);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: (error as Error).message
    });
  }
});

export default router;