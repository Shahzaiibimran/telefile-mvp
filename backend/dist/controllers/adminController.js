"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoteAdmin = exports.promoteToAdmin = exports.deleteUser = exports.getSystemStats = exports.getUserDetails = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const File_1 = __importDefault(require("../models/File"));
const FileChunk_1 = __importDefault(require("../models/FileChunk"));
const fileService = __importStar(require("../services/fileService"));
/**
 * Get all users
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.find({})
            .select('_id name email storage_used created_at is_admin')
            .sort({ created_at: -1 });
        res.json({ users });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Failed to get users' });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * Get user details with files
 */
const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const files = await File_1.default.find({ user: userId })
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
    }
    catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ message: 'Failed to get user details' });
    }
};
exports.getUserDetails = getUserDetails;
/**
 * Get system stats
 */
const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const totalFiles = await File_1.default.countDocuments();
        const totalChunks = await FileChunk_1.default.countDocuments();
        // Get total storage used
        const storageAggregation = await User_1.default.aggregate([
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
        const recentUsers = await User_1.default.countDocuments({
            created_at: { $gte: lastWeek }
        });
        // Get recent file uploads (last 7 days)
        const recentFiles = await File_1.default.countDocuments({
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
    }
    catch (error) {
        console.error('Get system stats error:', error);
        res.status(500).json({ message: 'Failed to get system stats' });
    }
};
exports.getSystemStats = getSystemStats;
/**
 * Delete user
 */
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        // Verify the user exists
        const userToDelete = await User_1.default.findById(userId);
        if (!userToDelete) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Get the admin user
        const adminUser = req.user;
        // Find all files for the user
        const files = await File_1.default.find({ user: userId });
        console.log(`Found ${files.length} files to delete for user ${userId}`);
        // Delete each file properly using the fileService (handles storage bucket deletion)
        const fileErrors = [];
        for (const file of files) {
            try {
                // Use fileService.deleteFile to properly delete file both from bucket and database
                await fileService.deleteFile(file._id.toString(), adminUser._id.toString());
                console.log(`Successfully deleted file ${file._id} for user ${userId}`);
            }
            catch (error) {
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
        const deletedUser = await User_1.default.findByIdAndDelete(userId);
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
        }
        else {
            res.json({ message: 'User and all associated files deleted successfully' });
        }
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
/**
 * Promote user to admin
 */
const promoteToAdmin = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Admin promotion requested for user: ${userId}`);
        if (!req.user || !req.user.is_admin) {
            console.log('Promotion attempt rejected: Requester is not an admin');
            res.status(403).json({ message: 'Only admins can promote users' });
            return;
        }
        // Find the user to promote
        const userToPromote = await User_1.default.findById(userId);
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
    }
    catch (error) {
        console.error('Error in promoteToAdmin:', error);
        res.status(500).json({ message: 'Failed to promote user to admin' });
    }
};
exports.promoteToAdmin = promoteToAdmin;
/**
 * Demote admin to regular user
 */
const demoteAdmin = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Admin demotion requested for user: ${userId}`);
        if (!req.user || !req.user.is_admin) {
            console.log('Demotion attempt rejected: Requester is not an admin');
            res.status(403).json({ message: 'Only admins can demote users' });
            return;
        }
        // Check if trying to demote self
        if (req.user._id.toString() === userId) {
            console.log('Self-demotion rejected: Admin tried to demote themselves');
            res.status(400).json({ message: 'You cannot demote yourself' });
            return;
        }
        // Find the user to demote
        const userToDemote = await User_1.default.findById(userId);
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
    }
    catch (error) {
        console.error('Error in demoteAdmin:', error);
        res.status(500).json({ message: 'Failed to demote user from admin' });
    }
};
exports.demoteAdmin = demoteAdmin;
