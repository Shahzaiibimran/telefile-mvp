import File, { IFile } from '../models/File';
import FileChunk, { IFileChunk } from '../models/FileChunk';
import User, { IUser } from '../models/User';
import s3, { storageConfig } from '../config/storage';
import { generateShareLink } from '../utils/generateShareLink';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

/**
 * Initialize a new file upload
 */
export const initializeFileUpload = async (
  userId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  expiryDays?: number
): Promise<IFile> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Generate a unique share link
    const shareLink = await generateShareLink();
    
    // Calculate expiry date (default 5 days)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (expiryDays || 5));
    expiry.setHours(23, 59, 59, 999);
    
    // Check file size limit
    if (fileSize > storageConfig.maxFileSize) {
      throw new Error(`File size exceeds the maximum allowed size of ${storageConfig.maxFileSize / (1024 * 1024 * 1024)}GB`);
    }
    
    // Create file record
    const file = await File.create(
      [{
        name: fileName,
        size: fileSize,
        user: userId,
        share_link: shareLink,
        expiry,
        mime_type: mimeType,
        is_uploaded: false
      }],
      { session }
    );
    
    // Update user's storage quota
    await User.findByIdAndUpdate(
      userId,
      { $inc: { storage_used: fileSize } },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    
    return file[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Prepare for chunk upload
 */
export const prepareChunkUpload = async (
  fileId: string,
  chunkIndex: number,
  chunkSize: number
): Promise<{ uploadUrl: string, chunkId: string }> => {
  try {
    // Find the file
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    if (file.is_uploaded) {
      throw new Error('File is already fully uploaded');
    }
    
    // Check if chunk already exists
    let chunk = await FileChunk.findOne({ file: fileId, chunk_index: chunkIndex });
    
    if (!chunk) {
      // Create new chunk record
      const storagePath = `${file.user}/${fileId}/${chunkIndex}`;
      
      chunk = await FileChunk.create({
        file: fileId,
        chunk_index: chunkIndex,
        storage_path: storagePath,
        size: chunkSize,
        is_uploaded: false
      });
    } else if (chunk.is_uploaded) {
      throw new Error('Chunk is already uploaded');
    }
    
    // Generate presigned URL for upload
    const params = {
      Bucket: storageConfig.bucketName,
      Key: chunk.storage_path,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const uploadUrl = s3.getSignedUrl('putObject', params);
    
    return {
      uploadUrl,
      chunkId: chunk._id.toString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Upload chunk directly through backend
 */
export const uploadChunkDirect = async (
  fileId: string,
  chunkIndex: number,
  multerFile: Express.Multer.File
): Promise<{ chunkId: string }> => {
  console.log(`Starting direct upload for file ${fileId}, chunk ${chunkIndex}`);
  try {
    // Find the file
    const file = await File.findById(fileId);
    
    if (!file) {
      console.log(`File ${fileId} not found`);
      throw new Error('File not found');
    }
    
    if (file.is_uploaded) {
      console.log(`File ${fileId} is already fully uploaded`);
      throw new Error('File is already fully uploaded');
    }
    
    // Validate chunk file
    if (!multerFile || !multerFile.path) {
      console.log('Invalid chunk file object:', multerFile);
      throw new Error('Invalid chunk file');
    }
    
    // Check if chunk already exists or create a new one
    let chunk = await FileChunk.findOne({ file: fileId, chunk_index: chunkIndex });
    
    if (!chunk) {
      // Create new chunk record
      const fileUserId = file.user ? file.user.toString() : 'unknown';
      // Use a more descriptive path that includes the file name
      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
      const storagePath = `${fileUserId}/${fileId}/${fileName}_chunk${chunkIndex}`;
      console.log(`Creating new chunk record with path: ${storagePath}`);
      
      chunk = await FileChunk.create({
        file: fileId,
        chunk_index: chunkIndex,
        storage_path: storagePath,
        size: multerFile.size,
        is_uploaded: false
      });
      
      console.log(`Created new chunk with ID: ${chunk._id}`);
    } else if (chunk.is_uploaded) {
      console.log(`Chunk ${chunkIndex} is already uploaded`);
      throw new Error('Chunk is already uploaded');
    } else {
      console.log(`Found existing chunk record for index ${chunkIndex}`);
    }
    
    // Upload chunk to S3
    console.log(`Uploading chunk to storage at path: ${chunk.storage_path}`);
    
    try {
      // Log detailed information about the chunk file
      console.log('Chunk file details:', {
        originalname: multerFile.originalname,
        path: multerFile.path,
        size: multerFile.size,
        mimetype: multerFile.mimetype
      });

      // Read the file from disk
      const fs = require('fs');
      const fileData = fs.readFileSync(multerFile.path);
      console.log(`Read ${fileData.length} bytes from disk file`);
      
      // Update the chunk size to the actual size
      if (fileData.length > 0 && fileData.length !== chunk.size) {
        console.log(`Updating chunk size from ${chunk.size} to ${fileData.length}`);
        chunk = await FileChunk.findByIdAndUpdate(
          chunk._id,
          { size: fileData.length },
          { new: true }
        );
      }

      if (!fileData || fileData.length === 0) {
        throw new Error('File data is empty, cannot upload to S3');
      }

      const params = {
        Bucket: storageConfig.bucketName,
        Key: chunk?.storage_path,
        Body: fileData,
        ContentType: multerFile.mimetype || 'application/octet-stream'
      };
      
      console.log(`Starting S3 upload for chunk ${chunkIndex} with params:`, {
        Bucket: params.Bucket,
        Key: params.Key,
        ContentType: params.ContentType,
        BodySize: fileData.length,
        S3Endpoint: process.env.BACKBLAZE_ENDPOINT
      });

      const uploadResult = await s3.upload(params).promise();
      console.log(`S3 upload successful, ETag: ${uploadResult.ETag}, Location: ${uploadResult.Location}`);
      
      // Try to delete the temporary file
      try {
        fs.unlinkSync(multerFile.path);
        console.log(`Deleted temporary file: ${multerFile.path}`);
      } catch (deleteError) {
        console.warn(`Failed to delete temporary file: ${multerFile.path}`, deleteError);
        // Continue even if we couldn't delete the temp file
      }
      
      // Update chunk status
      chunk = await FileChunk.findByIdAndUpdate(
        chunk?._id,
        { 
          is_uploaded: true,
          etag: uploadResult.ETag 
        },
        { new: true }
      );
      
      if (!chunk) {
        console.log(`Failed to update chunk status after upload`);
        throw new Error('Failed to update chunk status');
      }
      
      console.log(`Successfully updated chunk status to uploaded`);
      
      return {
        chunkId: chunk._id ? chunk._id.toString() : ''
      };
    } catch (s3Error: any) {
      console.error('S3 upload error details:', {
        errorName: s3Error.name,
        errorCode: s3Error.code,
        errorMessage: s3Error.message,
        statusCode: s3Error.statusCode,
        requestId: s3Error.requestId
      });
      throw new Error(`S3 upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Upload chunk direct service error:', error);
    throw error;
  }
};

/**
 * Complete file upload - check if all chunks are uploaded
 */
export const completeFileUpload = async (fileId: string): Promise<void> => {
  try {
    // Find the file
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    // Check if all chunks are uploaded
    const totalChunks = Math.ceil(file.size / storageConfig.chunkSize);
    const uploadedChunks = await FileChunk.countDocuments({ 
      file: file._id, 
      is_uploaded: true 
    });
    
    // If all chunks are uploaded, mark file as complete
    if (uploadedChunks === totalChunks) {
      await File.findByIdAndUpdate(file._id, { is_uploaded: true });
    } else {
      throw new Error(`Not all chunks are uploaded (${uploadedChunks}/${totalChunks})`);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Confirm chunk upload was successful
 */
export const confirmChunkUpload = async (
  chunkId: string,
  etag: string
): Promise<IFileChunk> => {
  try {
    // Update chunk status
    const chunk = await FileChunk.findByIdAndUpdate(
      chunkId,
      { 
        is_uploaded: true,
        etag 
      },
      { new: true }
    );
    
    if (!chunk) {
      throw new Error('Chunk not found');
    }
    
    // Check if all chunks are uploaded
    const file = await File.findById(chunk.file);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    const totalChunks = Math.ceil(file.size / storageConfig.chunkSize);
    const uploadedChunks = await FileChunk.countDocuments({ 
      file: file._id, 
      is_uploaded: true 
    });
    
    // If all chunks are uploaded, mark file as complete
    if (uploadedChunks === totalChunks) {
      await File.findByIdAndUpdate(file._id, { is_uploaded: true });
    }
    
    return chunk;
  } catch (error) {
    throw error;
  }
};

/**
 * Get download URLs for file chunks
 */
export const getFileDownloadUrls = async (
  shareLink: string
): Promise<{ file: IFile, downloadUrls: string[] }> => {
  try {
    console.log(`Getting download URLs for share link: ${shareLink}`);
    
    // Find file by share link
    const file = await File.findOne({ share_link: shareLink });
    
    if (!file) {
      console.error(`File not found for share link: ${shareLink}`);
      throw new Error('File not found');
    }
    
    console.log(`Found file: ${file._id}, name: ${file.name}, uploaded: ${file.is_uploaded}, size: ${file.size} bytes`);
    
    // Check if file is expired
    if (new Date() > file.expiry) {
      console.error(`File has expired. Expiry: ${file.expiry}, Current: ${new Date()}`);
      throw new Error('File has expired');
    }
    
    // Check if file is fully uploaded
    if (!file.is_uploaded) {
      console.error(`File is not fully uploaded yet. File ID: ${file._id}`);
      throw new Error('File is not fully uploaded yet');
    }
    
    // Get all chunks for the file
    const chunks = await FileChunk.find({ 
      file: file._id,
      is_uploaded: true
    }).sort({ chunk_index: 1 });
    
    if (chunks.length === 0) {
      console.error(`No chunks found for file ${file._id}`);
      throw new Error('No chunks found for this file');
    }
    
    console.log(`Found ${chunks.length} chunks for file ${file._id}`);
    chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i}: ${chunk.storage_path}, size: ${chunk.size} bytes, uploaded: ${chunk.is_uploaded}`);
    });
    
    // Verify that the chunks exist in the storage bucket before generating URLs
    const verificationPromises = chunks.map(async (chunk) => {
      try {
        console.log(`Verifying chunk exists in bucket: ${storageConfig.bucketName}, Key: ${chunk.storage_path}`);
        const headParams = {
          Bucket: storageConfig.bucketName,
          Key: chunk.storage_path
        };
        
        // Use a promise with timeout to avoid hanging on verification
        const headPromise = s3.headObject(headParams).promise();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Verification timed out')), 5000);
        });
        
        await Promise.race([headPromise, timeoutPromise]);
        return { chunk, exists: true };
      } catch (error) {
        console.error(`Error verifying chunk existence: ${chunk.storage_path}`, error);
        return { chunk, exists: false, error };
      }
    });
    
    const verificationResults = await Promise.all(verificationPromises);
    const missingChunks = verificationResults.filter(result => !result.exists);
    
    if (missingChunks.length > 0) {
      console.error(`${missingChunks.length} chunks missing from storage:`, 
        missingChunks.map(m => m.chunk.storage_path));
      throw new Error('Some file chunks are missing from storage');
    }
    
    // For diagnostic purposes, log the S3 endpoint and bucket
    console.log('S3 Configuration:', {
      endpoint: process.env.BACKBLAZE_ENDPOINT || 'Not set',
      bucketName: storageConfig.bucketName || 'Not set',
      bucketId: storageConfig.bucketId || 'Not set'
    });
    
    // Generate presigned URLs for each chunk
    const downloadUrls = await Promise.all(chunks.map(async (chunk, index) => {
      // Set up clean filename for download
      const sanitizedName = file.name.replace(/[/\\?%*:|"<>]/g, '_');
      let downloadFilename = sanitizedName;
      
      // Add suffix for multi-chunk files
      if (chunks.length > 1) {
        const ext = sanitizedName.includes('.') ? 
          sanitizedName.substring(sanitizedName.lastIndexOf('.')) : '';
        const nameWithoutExt = sanitizedName.includes('.') ? 
          sanitizedName.substring(0, sanitizedName.lastIndexOf('.')) : sanitizedName;
        downloadFilename = `${nameWithoutExt}_part${index + 1}${ext}`;
      }
      
      // URL encode the filename for content disposition
      const encodedFilename = encodeURIComponent(downloadFilename);
      
      // Set the proper content disposition header for the filename
      try {
        const params = {
          Bucket: storageConfig.bucketName,
          Key: chunk.storage_path,
          Expires: 7200, // Increase expiry to 2 hours to allow more time for download
          ResponseContentDisposition: `attachment; filename="${encodedFilename}"`,
          ResponseContentType: file.mime_type || 'application/octet-stream'
        };
        
        console.log(`Creating download URL for chunk:`, {
          bucket: storageConfig.bucketName,
          key: chunk.storage_path,
          expires: 7200,
          contentType: file.mime_type || 'application/octet-stream'
        });
        
        // Use a promise with timeout to avoid hanging
        const getUrlPromise = new Promise<string>((resolve, reject) => {
          try {
            const url = s3.getSignedUrl('getObject', params);
            console.log(`Generated presigned URL (truncated): ${url.substring(0, 80)}...`);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        });
        
        // Add timeout to avoid hanging if S3 is not responding
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('URL generation timed out')), 10000); // Increased timeout
        });
        
        // Race the promises
        const url = await Promise.race([getUrlPromise, timeoutPromise]);
        
        return url;
      } catch (error) {
        console.error(`Error generating presigned URL for chunk ${chunk._id}:`, error);
        throw new Error(`Failed to generate download URL for chunk ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }));
    
    console.log(`Generated ${downloadUrls.length} download URLs successfully`);
    
    return {
      file,
      downloadUrls
    };
  } catch (error) {
    console.error('Error in getFileDownloadUrls:', error);
    throw error;
  }
};

/**
 * Delete file and associated chunks
 */
export const deleteFile = async (fileId: string, userId: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find file
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    // Ensure user owns the file or is admin
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (file.user.toString() !== userId && !user.is_admin) {
      throw new Error('Not authorized to delete this file');
    }
    
    // Get all chunks
    const chunks = await FileChunk.find({ file: fileId });
    console.log(`Deleting file ${file.name} (${fileId}) with ${chunks.length} chunks`);
    
    // Delete chunks from storage with better error handling
    const deletePromises = chunks.map(async (chunk) => {
      if (!chunk.storage_path) {
        console.warn(`Chunk ${chunk._id.toString()} has no storage path`);
        return;
      }
      
      try {
        console.log(`Deleting chunk from storage: ${chunk.storage_path}`);
        await s3.deleteObject({
          Bucket: storageConfig.bucketName,
          Key: chunk.storage_path
        }).promise();
        console.log(`Successfully deleted chunk from bucket: ${chunk.storage_path}`);
      } catch (err) {
        console.error(`Failed to delete chunk ${chunk._id.toString()} from storage: ${err}`);
        // Re-throw to ensure we catch failures
        throw err;
      }
    });
    
    // Wait for all storage deletions to complete before proceeding with database operations
    try {
      await Promise.all(deletePromises);
      console.log(`Successfully deleted all chunks from storage for file ${fileId}`);
    } catch (storageError) {
      console.error(`Error during chunk deletion from storage: ${storageError}`);
      // Abort the transaction and throw error - this prevents database deletion when storage deletion fails
      await session.abortTransaction();
      session.endSession();
      throw new Error('Failed to delete one or more chunks from storage');
    }
    
    // Only proceed with database deletions if all storage deletions were successful
    // Delete chunks from database
    await FileChunk.deleteMany({ file: fileId }, { session });
    
    // Delete file from database
    await File.findByIdAndDelete(fileId, { session });
    
    // Update user's storage quota
    await User.findByIdAndUpdate(
      userId,
      { $inc: { storage_used: -file.size } },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    console.log(`File ${fileId} and all its chunks successfully deleted`);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`Error in deleteFile: ${error}`);
    throw error;
  }
};

/**
 * Cancel ongoing file upload and clean up
 */
export const cancelFileUpload = async (fileId: string, userId?: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log(`Cancelling upload for file ID: ${fileId}`);
    
    // Get the file record first to check if it exists and get S3 keys
    const file = await File.findById(fileId);
    
    if (!file) {
      throw new ApiError(404, 'File not found');
    }
    
    // If userId is provided, verify ownership
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      
      if (file.user.toString() !== userId && !user.is_admin) {
        throw new ApiError(403, 'Not authorized to cancel this upload');
      }
    }
    
    // Get all chunks for this file
    const chunks = await FileChunk.find({ file: fileId });
    
    console.log(`Found file to cancel with ${chunks.length} chunks`);
    
    // Track successful and failed deletions
    const deleteResults = [];
    let hasDeleteErrors = false;
    
    // Delete each chunk from S3 first
    for (const chunk of chunks) {
      if (chunk.storage_path) {
        try {
          console.log(`Deleting chunk from S3: ${chunk.storage_path}`);
          await s3.deleteObject({
            Bucket: storageConfig.bucketName,
            Key: chunk.storage_path
          }).promise();
          console.log(`Successfully deleted chunk: ${chunk.storage_path}`);
          deleteResults.push({ path: chunk.storage_path, success: true });
        } catch (error) {
          console.error(`Error deleting chunk ${chunk.storage_path} from S3:`, error);
          deleteResults.push({ 
            path: chunk.storage_path, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          hasDeleteErrors = true;
        }
      }
    }
    
    // If we had any deletion errors, abort the transaction and report the issue
    if (hasDeleteErrors) {
      console.error(`Some chunks failed to delete from storage. Aborting transaction.`);
      await session.abortTransaction();
      session.endSession();
      
      // Provide detailed error with which chunks failed
      const failedPaths = deleteResults
        .filter(result => !result.success)
        .map(result => result.path)
        .join(', ');
      
      throw new ApiError(500, `Failed to delete chunks from storage: ${failedPaths}`);
    }
    
    // Only if all storage deletions succeeded, proceed with database cleanup
    console.log(`Deleting file and chunks from database for file ID: ${fileId}`);
    await FileChunk.deleteMany({ file: fileId }, { session });
    
    // Decrease user's storage quota, but only if we have a user ID
    if (file.user) {
      console.log(`Updating storage for user ${file.user} by -${file.size} bytes`);
      await User.findByIdAndUpdate(
        file.user,
        { $inc: { storage_used: -file.size } },
        { session }
      );
    }
    
    // Finally delete the file record
    await File.findByIdAndDelete(fileId, { session });
    
    await session.commitTransaction();
    session.endSession();
    console.log(`Successfully cancelled upload for file ID: ${fileId}`);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`Error in cancelFileUpload for file ID ${fileId}:`, error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Failed to cancel file upload');
  }
}; 