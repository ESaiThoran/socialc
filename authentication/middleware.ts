// Authentication Middleware for SocialConnect
// Middleware for protecting routes and managing user sessions

import { Request, Response, NextFunction } from 'express';
import AuthenticationService from './auth';

// Extend the Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

interface RateLimitAttempt {
  count: number;
  resetTime: number;
}

export class AuthMiddleware {
  private authService: AuthenticationService;

  constructor() {
    this.authService = new AuthenticationService();
  }

  // Middleware to authenticate requests
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            success: false,
            message: 'Access token required'
          });
          return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = this.authService.verifyAccessToken(token);
        
        // Add user info to request
        req.user = decoded;
        req.userId = decoded.userId;
        
        next();
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          error: (error as Error).message
        });
      }
    };
  }

  // Optional authentication - doesn't fail if no token
  optionalAuth() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = this.authService.verifyAccessToken(token);
          req.user = decoded;
          req.userId = decoded.userId;
        }
        
        next();
      } catch (error) {
        // Continue without authentication
        next();
      }
    };
  }

  // Middleware to check user roles
  requireRole(roles: string | string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role || 'user';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }

  // Middleware to check if user owns resource
  requireOwnership(getResourceUserId: (req: Request) => Promise<string>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
          return;
        }

        const resourceUserId = await getResourceUserId(req);
        
        if (req.userId !== resourceUserId && req.user.role !== 'admin') {
          res.status(403).json({
            success: false,
            message: 'Access denied - resource ownership required'
          });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Error checking resource ownership',
          error: (error as Error).message
        });
      }
    };
  }

  // Rate limiting middleware for auth endpoints
  rateLimitAuth() {
    const attempts = new Map<string, RateLimitAttempt>();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return (req: Request, res: Response, next: NextFunction): void => {
      const clientId = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      if (!attempts.has(clientId)) {
        attempts.set(clientId, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      const clientAttempts = attempts.get(clientId)!;
      
      if (now > clientAttempts.resetTime) {
        attempts.set(clientId, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (clientAttempts.count >= maxAttempts) {
        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
        });
        return;
      }

      clientAttempts.count++;
      next();
    };
  }

  // CORS middleware for authentication routes
  corsAuth() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://localhost:5000'];
      const origin = req.headers.origin;
      
      // Only set Access-Control-Allow-Origin if it's an allowed origin
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      } else if (process.env.NODE_ENV === 'development') {
        // Allow all origins in development
        res.header('Access-Control-Allow-Origin', origin || '*');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '3600');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).send();
        return;
      }

      next();
    };
  }

  // Middleware to validate request body
  validateBody(requiredFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingFields: string[] = [];
      
      for (const field of requiredFields) {
        if (!req.body || req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          missingFields
        });
        return;
      }

      next();
    };
  }

  // Middleware to sanitize request body
  sanitizeBody(allowedFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.body && typeof req.body === 'object') {
        const sanitizedBody: Record<string, any> = {};
        
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            sanitizedBody[field] = req.body[field];
          }
        }
        
        req.body = sanitizedBody;
      }
      
      next();
    };
  }

  // Middleware to log authentication events
  logAuth() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`[AUTH] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
        
        // Log failed authentication attempts
        if (res.statusCode === 401 || res.statusCode === 403) {
          console.log(`[AUTH_FAILURE] Failed authentication attempt from ${req.ip} - ${req.originalUrl}`);
        }
        
        return originalSend.call(this, body);
      };

      next();
    };
  }

  // Middleware to check if user is verified (for sensitive operations)
  requireVerification() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!req.user.isVerified) {
        res.status(403).json({
          success: false,
          message: 'Account verification required'
        });
        return;
      }

      next();
    };
  }

  // Middleware to check if user account is active
  requireActiveAccount() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Add more checks here as needed (e.g., suspended, banned, etc.)
      // For now, just check if user exists
      if (!req.user.userId) {
        res.status(403).json({
          success: false,
          message: 'Invalid user account'
        });
        return;
      }

      next();
    };
  }
}

export default AuthMiddleware;