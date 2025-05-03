import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { authConfig } from '../config/auth';

// Correct way to extend the Express Request type
// Override the existing User type entirely
declare global {
  namespace Express {
    // Completely replace the existing interface
    interface User extends IUser {}
  }
}

/**
 * Middleware to authenticate user with JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('Authentication failed: No token provided');
      res.status(401).json({ message: 'No authentication token, access denied' });
      return;
    }

    try {
      // Verify token
      // @ts-ignore - JWT verify has complex typings that are hard to satisfy
      const decoded = jwt.verify(token, authConfig.jwtSecret) as { userId: string };
      
      // Find user by id
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log(`Authentication failed: User ID ${decoded.userId} not found`);
        res.status(401).json({ message: 'User not found, access denied' });
        return;
      }
      
      // Add user to request
      req.user = user;
      req.userId = decoded.userId;
      
      next();
    } catch (error) {
      // Check if token is expired
      if (error instanceof jwt.TokenExpiredError) {
        console.log('Authentication failed: Token expired');
        res.status(401).json({ message: 'Token has expired', code: 'TOKEN_EXPIRED' });
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('Authentication failed: Invalid token');
        res.status(401).json({ message: 'Token is invalid', code: 'TOKEN_INVALID' });
      } else {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Authentication failed' });
      }
    }
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

/**
 * Middleware to check if user is admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  console.log('Running isAdmin middleware check...');
  console.log('Request URL:', req.originalUrl);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  
  if (!req.user) {
    console.error('Access denied: No user in request');
    res.status(403).json({ message: 'Access denied, admin rights required' });
    return;
  }
  
  // Explicitly check is_admin flag type and value
  const isAdminFlag = req.user.is_admin;
  console.log(`Admin check for user ${req.user.email}:`);
  console.log(`- is_admin value: ${isAdminFlag}`);
  console.log(`- is_admin type: ${typeof isAdminFlag}`);
  console.log(`- Full user object:`, req.user);
  
  // Check different potential values to catch edge cases
  const isAdminBoolean = Boolean(isAdminFlag);
  const isAdminString = String(isAdminFlag).toLowerCase();
  console.log(`- is_admin as boolean: ${isAdminBoolean}`);
  console.log(`- is_admin as string: ${isAdminString}`);
  
  if (!isAdminFlag) {
    console.error(`Access denied: User ${req.user.email} is not an admin`);
    res.status(403).json({ message: 'Access denied, admin rights required' });
    return;
  }
  
  // User is admin, proceed
  console.log(`Admin access granted for ${req.user.email}`);
  next();
}; 