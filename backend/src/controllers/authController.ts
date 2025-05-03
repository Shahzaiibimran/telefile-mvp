import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { authConfig } from '../config/auth';
import File from '../models/File';

/**
 * Generate JWT token for a user
 */
const generateToken = (user: IUser): string => {
  // TypeScript has challenges with the jwt.sign types, so we use ts-ignore
  // @ts-ignore - JWT sign has complex typings that are hard to satisfy
  return jwt.sign({ userId: user._id }, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiration
  });
};

/**
 * Google OAuth callback handler
 */
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication failed' });
      return;
    }
    
    const user = req.user as IUser;
    const token = generateToken(user);
    
    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

/**
 * Get current user details with accurately calculated storage usage
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const user = req.user as IUser;
    
    // For debugging - log if the user has admin status
    console.log(`User ${user.email} requested details, is_admin status: ${user.is_admin}`);
    
    // Calculate actual storage used based on fully uploaded files
    const uploadedFiles = await File.find({ 
      user: user._id, 
      is_uploaded: true
    });
    
    const actualStorageUsed = uploadedFiles.reduce((total, file) => {
      return total + file.size;
    }, 0);
    
    // Update user's storage_used if it doesn't match
    if (user.storage_used !== actualStorageUsed) {
      await User.findByIdAndUpdate(user._id, { storage_used: actualStorageUsed });
      user.storage_used = actualStorageUsed;
    }
    
    // Make sure we get the most up-to-date user data, including admin status
    const freshUser = await User.findById(user._id);
    if (!freshUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Always generate a fresh JWT token with the latest user data
    // This helps keep the session alive as long as the user is active
    const token = generateToken(freshUser);
    
    res.json({
      user: {
        _id: freshUser._id,
        name: freshUser.name,
        email: freshUser.email,
        storage_used: freshUser.storage_used,
        is_admin: freshUser.is_admin // Use the direct value from database
      },
      token // Include the fresh token in the response
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Recalculate user storage used
 */
export const recalculateStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    const user = req.user as IUser;
    
    // Calculate storage based on completed uploads
    const uploadedFiles = await File.find({ 
      user: user._id, 
      is_uploaded: true
    });
    
    const actualStorageUsed = uploadedFiles.reduce((total, file) => {
      return total + file.size;
    }, 0);
    
    // Update user's storage used
    await User.findByIdAndUpdate(user._id, { storage_used: actualStorageUsed });
    
    res.json({
      success: true,
      storageUsed: actualStorageUsed
    });
  } catch (error) {
    console.error('Recalculate storage error:', error);
    res.status(500).json({ message: 'Failed to recalculate storage' });
  }
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response): void => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
}; 