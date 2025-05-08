import { Request, Response } from 'express';
import File from '../models/File';
import * as fileService from '../services/fileService';
import { IUser } from '../models/User';
import FileChunk from '../models/FileChunk';
import s3 from '../config/storage';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Initialize file upload
 */
export const initializeUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, fileSize, mimeType, expiryDays } = req.body;
    
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    if (!fileName || !fileSize || !mimeType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    // Type assertion for req.user to access _id
    const user = authReq.user;
    
    const file = await fileService.initializeFileUpload(
      user._id.toString(),
      fileName,
      fileSize,
      mimeType,
      expiryDays
    );
    
    res.status(201).json({ file });
  } catch (error) {
    console.error('Initialize upload error:', error);
    
    if (error instanceof Error && error.message.includes('File size exceeds')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to initialize file upload' });
    }
  }
};

/**
 * Get upload URL for chunk
 */
export const getChunkUploadUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, chunkIndex, chunkSize } = req.body;
    
    if (!fileId || chunkIndex === undefined || !chunkSize) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    const result = await fileService.prepareChunkUpload(fileId, chunkIndex, chunkSize);
    
    res.json(result);
  } catch (error) {
    console.error('Get chunk upload URL error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'File not found' || error.message === 'Chunk is already uploaded') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to generate upload URL' });
      }
    } else {
      res.status(500).json({ message: 'Failed to generate upload URL' });
    }
  }
};

/**
 * Upload chunk directly to the server
 */
export const uploadChunk = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if we have a file from multer middleware
    if (!req.file) {
      console.log('No chunk file found in request');
      res.status(400).json({ message: 'No chunk file uploaded' });
      return;
    }
    
    const { fileId, chunkIndex } = req.body;
    
    if (!fileId || chunkIndex === undefined) {
      console.log('Missing required fields:', { fileId, chunkIndex });
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    console.log(`Processing chunk ${chunkIndex} for file ${fileId}`);
    
    // Validate the chunk has actual content
    if (req.file.size === 0) {
      console.error('Received empty chunk file');
      res.status(400).json({ message: 'Empty chunk file received' });
      return;
    }
    
    console.log(`Chunk size: ${req.file.size} bytes, path: ${req.file.path}`);
    
    try {
      const result = await fileService.uploadChunkDirect(
        fileId, 
        parseInt(chunkIndex), 
        req.file
      );
      
      console.log(`Successfully uploaded chunk ${chunkIndex} for file ${fileId}`);
      res.json(result);
    } catch (uploadError) {
      console.error('Error in upload chunk service:', uploadError);
      
      if (uploadError instanceof Error) {
        if (uploadError.message === 'File not found') {
          res.status(400).json({ message: uploadError.message });
        } else {
          res.status(500).json({ 
            message: 'Failed to upload chunk',
            error: uploadError.message
          });
        }
      } else {
        res.status(500).json({ message: 'Failed to upload chunk' });
      }
    }
  } catch (error) {
    console.error('Upload chunk controller error:', error);
    
    res.status(500).json({ 
      message: 'Failed to process upload chunk request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Complete file upload
 */
export const completeUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    await fileService.completeFileUpload(fileId);
    
    res.json({ message: 'File upload completed successfully' });
  } catch (error) {
    console.error('Complete upload error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'File not found') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to complete file upload' });
      }
    } else {
      res.status(500).json({ message: 'Failed to complete file upload' });
    }
  }
};

/**
 * Confirm chunk upload
 */
export const confirmChunkUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chunkId, etag } = req.body;
    
    if (!chunkId || !etag) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    const chunk = await fileService.confirmChunkUpload(chunkId, etag);
    
    res.json({ chunk });
  } catch (error) {
    console.error('Confirm chunk upload error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Chunk not found' || error.message === 'File not found') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to confirm chunk upload' });
      }
    } else {
      res.status(500).json({ message: 'Failed to confirm chunk upload' });
    }
  }
};

/**
 * Get file download URLs
 */
export const getFileDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareLink } = req.params;
    
    if (!shareLink) {
      res.status(400).json({ message: 'Share link is required' });
      return;
    }
    
    const result = await fileService.getFileDownloadUrls(shareLink);
    
    res.json(result);
  } catch (error) {
    console.error('Get file download error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'File not found' || 
          error.message === 'File has expired' || 
          error.message === 'File is not fully uploaded yet' ||
          error.message === 'No chunks found for this file' ||
          error.message === 'Some file chunks are missing from storage') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ 
          message: 'Failed to get download URLs',
          details: error.message
        });
      }
    } else {
      res.status(500).json({ message: 'Failed to get download URLs' });
    }
  }
};

/**
 * Get user files
 */
export const getUserFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    // Type assertion for req.user to access _id
    const user = authReq.user;
    
    const files = await File.find({ user: user._id.toString() })
      .sort({ created_at: -1 });
    
    res.json({ files });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ message: 'Failed to get user files' });
  }
};

/**
 * Delete file
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    // Type assertion for req.user to access _id
    const user = authReq.user;
    
    await fileService.deleteFile(fileId, user._id.toString());
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'File not found' || error.message === 'Not authorized to delete this file') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to delete file' });
      }
    } else {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  }
};

/**
 * Cancel ongoing file upload
 */
export const cancelUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.body;
    console.log('Cancel upload request received for fileId:', fileId);
    
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      console.log('Cancel upload failed: User not authenticated');
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }
    
    if (!fileId) {
      console.log('Cancel upload failed: Missing fileId');
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    // Type assertion for req.user to access _id
    const user = authReq.user;
    console.log(`User ${user._id.toString()} attempting to cancel file ${fileId}`);
    
    await fileService.cancelFileUpload(fileId, user._id.toString());
    console.log(`Successfully cancelled upload for file ${fileId}`);
    
    res.json({ message: 'Upload cancelled successfully' });
  } catch (error) {
    console.error('Cancel upload error:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message;
      console.log(`Cancel upload failed with error: ${errorMessage}`);
      
      if (
        errorMessage === 'File not found' || 
        errorMessage === 'Not authorized to cancel this upload' ||
        errorMessage === 'File is already fully uploaded'
      ) {
        res.status(400).json({ message: errorMessage });
      } else {
        res.status(500).json({ message: 'Failed to cancel upload' });
      }
    } else {
      res.status(500).json({ message: 'Failed to cancel upload' });
    }
  }
};

/**
 * Increment download count
 */
export const incrementDownloadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    // Find and update file
    const file = await File.findByIdAndUpdate(
      fileId,
      { $inc: { download_count: 1 } },
      { new: true }
    );
    
    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }
    
    res.json({ success: true, downloadCount: file.download_count });
  } catch (error) {
    console.error('Increment download count error:', error);
    res.status(500).json({ message: 'Failed to update download count' });
  }
};

/**
 * Debug file status
 */
export const debugFileStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    // Find file
    const file = await File.findById(fileId);
    
    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }
    
    // Get chunks for this file
    const chunks = await FileChunk.find({ file: fileId }).sort({ chunk_index: 1 });
    
    // Simplify the response
    const fileData = {
      id: file._id,
      name: file.name,
      size: file.size,
      isUploaded: file.is_uploaded,
      shareLink: file.share_link,
      expiry: file.expiry,
      mimeType: file.mime_type,
      downloadCount: file.download_count
    };
    
    const chunkData = chunks.map(chunk => ({
      id: chunk._id,
      index: chunk.chunk_index,
      size: chunk.size,
      isUploaded: chunk.is_uploaded,
      storagePath: chunk.storage_path,
      etag: chunk.etag
    }));
    
    // Check if file exists in S3
    const s3CheckPromises = chunks.map(async (chunk: any) => {
      try {
        if (!process.env.BACKBLAZE_BUCKET_NAME) {
          return { path: chunk.storage_path, exists: false, error: "Bucket name not configured" };
        }
        
        const headParams = {
          Bucket: process.env.BACKBLAZE_BUCKET_NAME,
          Key: chunk.storage_path
        };
        
        await s3.headObject(headParams).promise();
        return { path: chunk.storage_path, exists: true, error: null };
      } catch (error) {
        return { 
          path: chunk.storage_path, 
          exists: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
    
    const s3Status = await Promise.all(s3CheckPromises);
    
    res.json({
      file: fileData,
      chunks: chunkData,
      storage: s3Status,
      totalChunks: chunks.length,
      uploadedChunks: chunks.filter((c: any) => c.is_uploaded).length
    });
  } catch (error) {
    console.error('Debug file status error:', error);
    res.status(500).json({ 
      message: 'Failed to get file status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 