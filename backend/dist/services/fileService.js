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
exports.cancelFileUpload = exports.deleteFile = exports.getFileDownloadUrls = exports.confirmChunkUpload = exports.completeFileUpload = exports.uploadChunkDirect = exports.prepareChunkUpload = exports.initializeFileUpload = void 0;
const File_1 = __importDefault(require("../models/File"));
const FileChunk_1 = __importDefault(require("../models/FileChunk"));
const User_1 = __importDefault(require("../models/User"));
const storage_1 = __importStar(require("../config/storage"));
const generateShareLink_1 = require("../utils/generateShareLink");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiError_1 = require("../utils/ApiError");
/**
 * Initialize a new file upload
 */
const initializeFileUpload = async (userId, fileName, fileSize, mimeType, expiryDays) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Generate a unique share link
        const shareLink = await (0, generateShareLink_1.generateShareLink)();
        // Calculate expiry date (default 5 days)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (expiryDays || 5));
        expiry.setHours(23, 59, 59, 999);
        // Check file size limit
        if (fileSize > storage_1.storageConfig.maxFileSize) {
            throw new Error(`File size exceeds the maximum allowed size of ${storage_1.storageConfig.maxFileSize / (1024 * 1024 * 1024)}GB`);
        }
        // Create file record
        const file = await File_1.default.create([{
                name: fileName,
                size: fileSize,
                user: userId,
                share_link: shareLink,
                expiry,
                mime_type: mimeType,
                is_uploaded: false
            }], { session });
        // Update user's storage quota
        await User_1.default.findByIdAndUpdate(userId, { $inc: { storage_used: fileSize } }, { session });
        await session.commitTransaction();
        session.endSession();
        return file[0];
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
exports.initializeFileUpload = initializeFileUpload;
/**
 * Prepare for chunk upload
 */
const prepareChunkUpload = async (fileId, chunkIndex, chunkSize) => {
    try {
        // Find the file
        const file = await File_1.default.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }
        if (file.is_uploaded) {
            throw new Error('File is already fully uploaded');
        }
        // Check if chunk already exists
        let chunk = await FileChunk_1.default.findOne({ file: fileId, chunk_index: chunkIndex });
        if (!chunk) {
            // Create new chunk record
            const storagePath = `${file.user}/${fileId}/${chunkIndex}`;
            chunk = await FileChunk_1.default.create({
                file: fileId,
                chunk_index: chunkIndex,
                storage_path: storagePath,
                size: chunkSize,
                is_uploaded: false
            });
        }
        else if (chunk.is_uploaded) {
            throw new Error('Chunk is already uploaded');
        }
        // Generate presigned URL for upload
        const params = {
            Bucket: storage_1.storageConfig.bucketName,
            Key: chunk.storage_path,
            Expires: 3600 // URL expires in 1 hour
        };
        const uploadUrl = storage_1.default.getSignedUrl('putObject', params);
        return {
            uploadUrl,
            chunkId: chunk._id.toString()
        };
    }
    catch (error) {
        throw error;
    }
};
exports.prepareChunkUpload = prepareChunkUpload;
/**
 * Upload chunk directly through backend
 */
const uploadChunkDirect = async (fileId, chunkIndex, multerFile) => {
    console.log(`Starting direct upload for file ${fileId}, chunk ${chunkIndex}`);
    try {
        // Find the file
        const file = await File_1.default.findById(fileId);
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
        let chunk = await FileChunk_1.default.findOne({ file: fileId, chunk_index: chunkIndex });
        if (!chunk) {
            // Create new chunk record
            const fileUserId = file.user ? file.user.toString() : 'unknown';
            // Use a more descriptive path that includes the file name
            const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
            const storagePath = `${fileUserId}/${fileId}/${fileName}_chunk${chunkIndex}`;
            console.log(`Creating new chunk record with path: ${storagePath}`);
            chunk = await FileChunk_1.default.create({
                file: fileId,
                chunk_index: chunkIndex,
                storage_path: storagePath,
                size: multerFile.size,
                is_uploaded: false
            });
            console.log(`Created new chunk with ID: ${chunk._id}`);
        }
        else if (chunk.is_uploaded) {
            console.log(`Chunk ${chunkIndex} is already uploaded`);
            throw new Error('Chunk is already uploaded');
        }
        else {
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
                chunk = await FileChunk_1.default.findByIdAndUpdate(chunk._id, { size: fileData.length }, { new: true });
            }
            if (!fileData || fileData.length === 0) {
                throw new Error('File data is empty, cannot upload to S3');
            }
            const params = {
                Bucket: storage_1.storageConfig.bucketName,
                Key: chunk.storage_path,
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
            const uploadResult = await storage_1.default.upload(params).promise();
            console.log(`S3 upload successful, ETag: ${uploadResult.ETag}, Location: ${uploadResult.Location}`);
            // Try to delete the temporary file
            try {
                fs.unlinkSync(multerFile.path);
                console.log(`Deleted temporary file: ${multerFile.path}`);
            }
            catch (deleteError) {
                console.warn(`Failed to delete temporary file: ${multerFile.path}`, deleteError);
                // Continue even if we couldn't delete the temp file
            }
            // Update chunk status
            chunk = await FileChunk_1.default.findByIdAndUpdate(chunk._id, {
                is_uploaded: true,
                etag: uploadResult.ETag
            }, { new: true });
            if (!chunk) {
                console.log(`Failed to update chunk status after upload`);
                throw new Error('Failed to update chunk status');
            }
            console.log(`Successfully updated chunk status to uploaded`);
            return {
                chunkId: chunk._id ? chunk._id.toString() : ''
            };
        }
        catch (s3Error) {
            console.error('S3 upload error details:', {
                errorName: s3Error.name,
                errorCode: s3Error.code,
                errorMessage: s3Error.message,
                statusCode: s3Error.statusCode,
                requestId: s3Error.requestId
            });
            throw new Error(`S3 upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
        }
    }
    catch (error) {
        console.error('Upload chunk direct service error:', error);
        throw error;
    }
};
exports.uploadChunkDirect = uploadChunkDirect;
/**
 * Complete file upload - check if all chunks are uploaded
 */
const completeFileUpload = async (fileId) => {
    try {
        // Find the file
        const file = await File_1.default.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }
        // Check if all chunks are uploaded
        const totalChunks = Math.ceil(file.size / storage_1.storageConfig.chunkSize);
        const uploadedChunks = await FileChunk_1.default.countDocuments({
            file: file._id,
            is_uploaded: true
        });
        // If all chunks are uploaded, mark file as complete
        if (uploadedChunks === totalChunks) {
            await File_1.default.findByIdAndUpdate(file._id, { is_uploaded: true });
        }
        else {
            throw new Error(`Not all chunks are uploaded (${uploadedChunks}/${totalChunks})`);
        }
    }
    catch (error) {
        throw error;
    }
};
exports.completeFileUpload = completeFileUpload;
/**
 * Confirm chunk upload was successful
 */
const confirmChunkUpload = async (chunkId, etag) => {
    try {
        // Update chunk status
        const chunk = await FileChunk_1.default.findByIdAndUpdate(chunkId, {
            is_uploaded: true,
            etag
        }, { new: true });
        if (!chunk) {
            throw new Error('Chunk not found');
        }
        // Check if all chunks are uploaded
        const file = await File_1.default.findById(chunk.file);
        if (!file) {
            throw new Error('File not found');
        }
        const totalChunks = Math.ceil(file.size / storage_1.storageConfig.chunkSize);
        const uploadedChunks = await FileChunk_1.default.countDocuments({
            file: file._id,
            is_uploaded: true
        });
        // If all chunks are uploaded, mark file as complete
        if (uploadedChunks === totalChunks) {
            await File_1.default.findByIdAndUpdate(file._id, { is_uploaded: true });
        }
        return chunk;
    }
    catch (error) {
        throw error;
    }
};
exports.confirmChunkUpload = confirmChunkUpload;
/**
 * Get download URLs for file chunks
 */
const getFileDownloadUrls = async (shareLink) => {
    try {
        console.log(`Getting download URLs for share link: ${shareLink}`);
        // Find file by share link
        const file = await File_1.default.findOne({ share_link: shareLink });
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
        const chunks = await FileChunk_1.default.find({
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
        // Generate presigned URLs for each chunk
        const downloadUrls = chunks.map((chunk, index) => {
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
                    Bucket: storage_1.storageConfig.bucketName,
                    Key: chunk.storage_path,
                    Expires: 3600, // URL expires in 1 hour
                    ResponseContentDisposition: `attachment; filename="${encodedFilename}"`,
                    ResponseContentType: file.mime_type || 'application/octet-stream'
                };
                console.log(`Creating download URL for chunk: ${chunk.storage_path} with filename: ${downloadFilename}`);
                const url = storage_1.default.getSignedUrl('getObject', params);
                console.log(`Generated presigned URL (truncated): ${url.substring(0, 80)}...`);
                return url;
            }
            catch (error) {
                console.error(`Error generating presigned URL for chunk ${chunk._id}:`, error);
                throw new Error(`Failed to generate download URL for chunk ${index}`);
            }
        });
        console.log(`Generated ${downloadUrls.length} download URLs successfully`);
        return {
            file,
            downloadUrls
        };
    }
    catch (error) {
        console.error('Error in getFileDownloadUrls:', error);
        throw error;
    }
};
exports.getFileDownloadUrls = getFileDownloadUrls;
/**
 * Delete file and associated chunks
 */
const deleteFile = async (fileId, userId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Find file
        const file = await File_1.default.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }
        // Ensure user owns the file or is admin
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (file.user.toString() !== userId && !user.is_admin) {
            throw new Error('Not authorized to delete this file');
        }
        // Get all chunks
        const chunks = await FileChunk_1.default.find({ file: fileId });
        console.log(`Deleting file ${file.name} (${fileId}) with ${chunks.length} chunks`);
        // Delete chunks from storage with better error handling
        const deletePromises = chunks.map(async (chunk) => {
            if (!chunk.storage_path) {
                console.warn(`Chunk ${chunk._id.toString()} has no storage path`);
                return;
            }
            try {
                console.log(`Deleting chunk from storage: ${chunk.storage_path}`);
                await storage_1.default.deleteObject({
                    Bucket: storage_1.storageConfig.bucketName,
                    Key: chunk.storage_path
                }).promise();
                console.log(`Successfully deleted chunk from bucket: ${chunk.storage_path}`);
            }
            catch (err) {
                console.error(`Failed to delete chunk ${chunk._id.toString()} from storage: ${err}`);
                // Re-throw to ensure we catch failures
                throw err;
            }
        });
        // Wait for all storage deletions to complete before proceeding with database operations
        try {
            await Promise.all(deletePromises);
            console.log(`Successfully deleted all chunks from storage for file ${fileId}`);
        }
        catch (storageError) {
            console.error(`Error during chunk deletion from storage: ${storageError}`);
            // Abort the transaction and throw error - this prevents database deletion when storage deletion fails
            await session.abortTransaction();
            session.endSession();
            throw new Error('Failed to delete one or more chunks from storage');
        }
        // Only proceed with database deletions if all storage deletions were successful
        // Delete chunks from database
        await FileChunk_1.default.deleteMany({ file: fileId }, { session });
        // Delete file from database
        await File_1.default.findByIdAndDelete(fileId, { session });
        // Update user's storage quota
        await User_1.default.findByIdAndUpdate(userId, { $inc: { storage_used: -file.size } }, { session });
        await session.commitTransaction();
        session.endSession();
        console.log(`File ${fileId} and all its chunks successfully deleted`);
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Error in deleteFile: ${error}`);
        throw error;
    }
};
exports.deleteFile = deleteFile;
/**
 * Cancel ongoing file upload and clean up
 */
const cancelFileUpload = async (fileId, userId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        console.log(`Cancelling upload for file ID: ${fileId}`);
        // Get the file record first to check if it exists and get S3 keys
        const file = await File_1.default.findById(fileId);
        if (!file) {
            throw new ApiError_1.ApiError(404, 'File not found');
        }
        // If userId is provided, verify ownership
        if (userId) {
            const user = await User_1.default.findById(userId);
            if (!user) {
                throw new ApiError_1.ApiError(404, 'User not found');
            }
            if (file.user.toString() !== userId && !user.is_admin) {
                throw new ApiError_1.ApiError(403, 'Not authorized to cancel this upload');
            }
        }
        // Get all chunks for this file
        const chunks = await FileChunk_1.default.find({ file: fileId });
        console.log(`Found file to cancel with ${chunks.length} chunks`);
        // Track successful and failed deletions
        const deleteResults = [];
        let hasDeleteErrors = false;
        // Delete each chunk from S3 first
        for (const chunk of chunks) {
            if (chunk.storage_path) {
                try {
                    console.log(`Deleting chunk from S3: ${chunk.storage_path}`);
                    await storage_1.default.deleteObject({
                        Bucket: storage_1.storageConfig.bucketName,
                        Key: chunk.storage_path
                    }).promise();
                    console.log(`Successfully deleted chunk: ${chunk.storage_path}`);
                    deleteResults.push({ path: chunk.storage_path, success: true });
                }
                catch (error) {
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
            throw new ApiError_1.ApiError(500, `Failed to delete chunks from storage: ${failedPaths}`);
        }
        // Only if all storage deletions succeeded, proceed with database cleanup
        console.log(`Deleting file and chunks from database for file ID: ${fileId}`);
        await FileChunk_1.default.deleteMany({ file: fileId }, { session });
        // Decrease user's storage quota, but only if we have a user ID
        if (file.user) {
            console.log(`Updating storage for user ${file.user} by -${file.size} bytes`);
            await User_1.default.findByIdAndUpdate(file.user, { $inc: { storage_used: -file.size } }, { session });
        }
        // Finally delete the file record
        await File_1.default.findByIdAndDelete(fileId, { session });
        await session.commitTransaction();
        session.endSession();
        console.log(`Successfully cancelled upload for file ID: ${fileId}`);
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Error in cancelFileUpload for file ID ${fileId}:`, error);
        throw error instanceof ApiError_1.ApiError ? error : new ApiError_1.ApiError(500, 'Failed to cancel file upload');
    }
};
exports.cancelFileUpload = cancelFileUpload;
