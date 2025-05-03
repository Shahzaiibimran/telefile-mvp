import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate, isAdmin);

// Admin routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/promote-admin', adminController.promoteToAdmin);
router.post('/users/:userId/demote-admin', adminController.demoteAdmin);

// System stats
router.get('/stats', adminController.getSystemStats);

export default router; 