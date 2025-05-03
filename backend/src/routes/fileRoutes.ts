import express from 'express';
import * as fileController from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import upload from '../config/multer';
import { storageConfig } from '../config/storage';

const router = express.Router();

// Protected routes (require authentication)
router.post('/initialize', authenticate, fileController.initializeUpload);
router.post('/get-chunk-upload-url', authenticate, fileController.getChunkUploadUrl);
router.post('/confirm-chunk-upload', authenticate, fileController.confirmChunkUpload);
router.post('/upload-chunk', authenticate, upload.single('chunk'), fileController.uploadChunk);
router.post('/complete-upload', authenticate, fileController.completeUpload);
router.post('/cancel-upload', authenticate, fileController.cancelUpload);
router.get('/user-files', authenticate, fileController.getUserFiles);
router.delete('/:fileId', authenticate, fileController.deleteFile);

// Public routes
router.get('/download/:shareLink', fileController.getFileDownload);
router.post('/increment-download', fileController.incrementDownloadCount);

// Debug routes - only enable in development
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/:fileId', fileController.debugFileStatus);
}

export default router;