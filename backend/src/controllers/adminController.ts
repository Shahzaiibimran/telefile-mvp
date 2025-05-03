import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import File from '../models/File';
import FileChunk from '../models/FileChunk';
import * as fileService from '../services/fileService';

/**
 * Get all users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({})
      .select('_id name email storage_used created_at is_admin')
      .sort({ created_at: -1 });
    
    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
};

/**
 * Get user details with files
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    const files = await File.find({ user: userId })
      .sort({ created_at: -1 });
    
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storage_used: user.storage_used,
        created_at: user.created_at
      },
      files
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Failed to get user details' });
  }
};

/**
 * Get system stats
 */
export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFiles = await File.countDocuments();
    const totalChunks = await FileChunk.countDocuments();
    
    // Get total storage used
    const storageAggregation = await User.aggregate([
      {
        $group: {
          _id: null,
          totalStorage: { $sum: '$storage_used' }
        }
      }
    ]);
    
    const totalStorage = storageAggregation.length > 0 ? storageAggregation[0].totalStorage : 0;
    
    // Get recent user registrations (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentUsers = await User.countDocuments({
      created_at: { $gte: lastWeek }
    });
    
    // Get recent file uploads (last 7 days)
    const recentFiles = await File.countDocuments({
      created_at: { $gte: lastWeek }
    });
    
    res.json({
      totalUsers,
      totalFiles,
      totalChunks,
      totalStorage,
      recentUsers,
      recentFiles
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ message: 'Failed to get system stats' });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    
    // Verify the user exists
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Get the admin user
    const adminUser = req.user as IUser;
    
    // Find all files for the user
    const files = await File.find({ user: userId });
    console.log(`Found ${files.length} files to delete for user ${userId}`);
    
    // Delete each file properly using the fileService (handles storage bucket deletion)
    const fileErrors = [];
    for (const file of files) {
      try {
        // Use fileService.deleteFile to properly delete file both from bucket and database
        await fileService.deleteFile(file._id.toString(), adminUser._id.toString());
        console.log(`Successfully deleted file ${file._id} for user ${userId}`);
      } catch (error) {
        console.error(`Error deleting file ${file._id}:`, error);
        fileErrors.push({
          fileId: file._id,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Report any file deletion errors
    if (fileErrors.length > 0) {
      console.warn(`Some files could not be deleted for user ${userId}:`, fileErrors);
    }
    
    // Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Return success with file deletion status
    if (fileErrors.length > 0) {
      res.json({ 
        message: 'User deleted but some files could not be removed completely',
        fileErrors
      });
    } else {
      res.json({ message: 'User and all associated files deleted successfully' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

/**
 * Promote user to admin
 */
export const promoteToAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    console.log(`Admin promotion requested for user: ${userId}`);
    
    if (!req.user || !(req.user as IUser).is_admin) {
      console.log('Promotion attempt rejected: Requester is not an admin');
      res.status(403).json({ message: 'Only admins can promote users' });
      return;
    }
    
    // Find the user to promote
    const userToPromote = await User.findById(userId);
    
    if (!userToPromote) {
      console.log(`User ${userId} not found for promotion`);
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    console.log(`Promoting user ${userToPromote.email} from is_admin=${userToPromote.is_admin} to true`);
    
    // Update the user to be an admin
    userToPromote.is_admin = true;
    await userToPromote.save();
    
    console.log(`User ${userToPromote.email} successfully promoted to admin`);
    
    res.json({ 
      success: true, 
      message: 'User promoted to admin successfully',
      user: {
        _id: userToPromote._id,
        name: userToPromote.name,
        email: userToPromote.email,
        is_admin: userToPromote.is_admin
      }
    });
  } catch (error) {
    console.error('Error in promoteToAdmin:', error);
    res.status(500).json({ message: 'Failed to promote user to admin' });
  }
};

/**
 * Demote admin to regular user
 */
export const demoteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    console.log(`Admin demotion requested for user: ${userId}`);
    
    if (!req.user || !(req.user as IUser).is_admin) {
      console.log('Demotion attempt rejected: Requester is not an admin');
      res.status(403).json({ message: 'Only admins can demote users' });
      return;
    }
    
    // Check if trying to demote self
    if ((req.user as IUser)._id.toString() === userId) {
      console.log('Self-demotion rejected: Admin tried to demote themselves');
      res.status(400).json({ message: 'You cannot demote yourself' });
      return;
    }
    
    // Find the user to demote
    const userToDemote = await User.findById(userId);
    
    if (!userToDemote) {
      console.log(`User ${userId} not found for demotion`);
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    if (!userToDemote.is_admin) {
      console.log(`User ${userToDemote.email} is already a regular user`);
      res.status(400).json({ message: 'User is already a regular user' });
      return;
    }
    
    console.log(`Demoting user ${userToDemote.email} from is_admin=${userToDemote.is_admin} to false`);
    
    // Update the user to be a regular user
    userToDemote.is_admin = false;
    await userToDemote.save();
    
    console.log(`User ${userToDemote.email} successfully demoted to regular user`);
    
    res.json({ 
      success: true, 
      message: 'User demoted to regular user successfully',
      user: {
        _id: userToDemote._id,
        name: userToDemote.name,
        email: userToDemote.email,
        is_admin: userToDemote.is_admin
      }
    });
  } catch (error) {
    console.error('Error in demoteAdmin:', error);
    res.status(500).json({ message: 'Failed to demote user from admin' });
  }
}; 