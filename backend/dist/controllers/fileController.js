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
exports.debugFileStatus = exports.incrementDownloadCount = exports.cancelUpload = exports.deleteFile = exports.getUserFiles = exports.getFileDownload = exports.confirmChunkUpload = exports.completeUpload = exports.uploadChunk = exports.getChunkUploadUrl = exports.initializeUpload = void 0;
const File_1 = __importDefault(require("../models/File"));
const fileService = __importStar(require("../services/fileService"));
const FileChunk_1 = __importDefault(require("../models/FileChunk"));
const storage_1 = __importDefault(require("../config/storage"));
/**
 * Initialize file upload
 */
const initializeUpload = async (req, res) => {
    try {
        const { fileName, fileSize, mimeType, expiryDays } = req.body;
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!fileName || !fileSize || !mimeType) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        // Type assertion for req.user to access _id
        const user = req.user;
        const file = await fileService.initializeFileUpload(user._id.toString(), fileName, fileSize, mimeType, expiryDays);
        res.status(201).json({ file });
    }
    catch (error) {
        console.error('Initialize upload error:', error);
        if (error instanceof Error && error.message.includes('File size exceeds')) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Failed to initialize file upload' });
        }
    }
};
exports.initializeUpload = initializeUpload;
/**
 * Get upload URL for chunk
 */
const getChunkUploadUrl = async (req, res) => {
    try {
        const { fileId, chunkIndex, chunkSize } = req.body;
        if (!fileId || chunkIndex === undefined || !chunkSize) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const result = await fileService.prepareChunkUpload(fileId, chunkIndex, chunkSize);
        res.json(result);
    }
    catch (error) {
        console.error('Get chunk upload URL error:', error);
        if (error instanceof Error) {
            if (error.message === 'File not found' || error.message === 'Chunk is already uploaded') {
                res.status(400).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Failed to generate upload URL' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to generate upload URL' });
        }
    }
};
exports.getChunkUploadUrl = getChunkUploadUrl;
/**
 * Upload chunk directly to the server
 */
const uploadChunk = async (req, res) => {
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
            const result = await fileService.uploadChunkDirect(fileId, parseInt(chunkIndex), req.file);
            console.log(`Successfully uploaded chunk ${chunkIndex} for file ${fileId}`);
            res.json(result);
        }
        catch (uploadError) {
            console.error('Error in upload chunk service:', uploadError);
            if (uploadError instanceof Error) {
                if (uploadError.message === 'File not found') {
                    res.status(400).json({ message: uploadError.message });
                }
                else {
                    res.status(500).json({
                        message: 'Failed to upload chunk',
                        error: uploadError.message
                    });
                }
            }
            else {
                res.status(500).json({ message: 'Failed to upload chunk' });
            }
        }
    }
    catch (error) {
        console.error('Upload chunk controller error:', error);
        res.status(500).json({
            message: 'Failed to process upload chunk request',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadChunk = uploadChunk;
/**
 * Complete file upload
 */
const completeUpload = async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) {
            res.status(400).json({ message: 'File ID is required' });
            return;
        }
        await fileService.completeFileUpload(fileId);
        res.json({ message: 'File upload completed successfully' });
    }
    catch (error) {
        console.error('Complete upload error:', error);
        if (error instanceof Error) {
            if (error.message === 'File not found') {
                res.status(400).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Failed to complete file upload' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to complete file upload' });
        }
    }
};
exports.completeUpload = completeUpload;
/**
 * Confirm chunk upload
 */
const confirmChunkUpload = async (req, res) => {
    try {
        const { chunkId, etag } = req.body;
        if (!chunkId || !etag) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const chunk = await fileService.confirmChunkUpload(chunkId, etag);
        res.json({ chunk });
    }
    catch (error) {
        console.error('Confirm chunk upload error:', error);
        if (error instanceof Error) {
            if (error.message === 'Chunk not found' || error.message === 'File not found') {
                res.status(400).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Failed to confirm chunk upload' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to confirm chunk upload' });
        }
    }
};
exports.confirmChunkUpload = confirmChunkUpload;
/**
 * Get file download URLs
 */
const getFileDownload = async (req, res) => {
    try {
        const { shareLink } = req.params;
        if (!shareLink) {
            res.status(400).json({ message: 'Share link is required' });
            return;
        }
        const result = await fileService.getFileDownloadUrls(shareLink);
        res.json(result);
    }
    catch (error) {
        console.error('Get file download error:', error);
        if (error instanceof Error) {
            if (error.message === 'File not found' ||
                error.message === 'File has expired' ||
                error.message === 'File is not fully uploaded yet' ||
                error.message === 'No chunks found for this file') {
                res.status(400).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Failed to get download URLs' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to get download URLs' });
        }
    }
};
exports.getFileDownload = getFileDownload;
/**
 * Get user files
 */
const getUserFiles = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Type assertion for req.user to access _id
        const user = req.user;
        const files = await File_1.default.find({ user: user._id })
            .sort({ created_at: -1 });
        res.json({ files });
    }
    catch (error) {
        console.error('Get user files error:', error);
        res.status(500).json({ message: 'Failed to get user files' });
    }
};
exports.getUserFiles = getUserFiles;
/**
 * Delete file
 */
const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!fileId) {
            res.status(400).json({ message: 'File ID is required' });
            return;
        }
        // Type assertion for req.user to access _id
        const user = req.user;
        await fileService.deleteFile(fileId, user._id.toString());
        res.json({ message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Delete file error:', error);
        if (error instanceof Error) {
            if (error.message === 'File not found' || error.message === 'Not authorized to delete this file') {
                res.status(400).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'Failed to delete file' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to delete file' });
        }
    }
};
exports.deleteFile = deleteFile;
/**
 * Cancel ongoing file upload
 */
const cancelUpload = async (req, res) => {
    try {
        const { fileId } = req.body;
        console.log('Cancel upload request received for fileId:', fileId);
        if (!req.user) {
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
        const user = req.user;
        console.log(`User ${user._id.toString()} attempting to cancel file ${fileId}`);
        await fileService.cancelFileUpload(fileId, user._id.toString());
        console.log(`Successfully cancelled upload for file ${fileId}`);
        res.json({ message: 'Upload cancelled successfully' });
    }
    catch (error) {
        console.error('Cancel upload error:', error);
        if (error instanceof Error) {
            const errorMessage = error.message;
            console.log(`Cancel upload failed with error: ${errorMessage}`);
            if (errorMessage === 'File not found' ||
                errorMessage === 'Not authorized to cancel this upload' ||
                errorMessage === 'File is already fully uploaded') {
                res.status(400).json({ message: errorMessage });
            }
            else {
                res.status(500).json({ message: 'Failed to cancel upload' });
            }
        }
        else {
            res.status(500).json({ message: 'Failed to cancel upload' });
        }
    }
};
exports.cancelUpload = cancelUpload;
/**
 * Increment download count
 */
const incrementDownloadCount = async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) {
            res.status(400).json({ message: 'File ID is required' });
            return;
        }
        // Find and update file
        const file = await File_1.default.findByIdAndUpdate(fileId, { $inc: { download_count: 1 } }, { new: true });
        if (!file) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        res.json({ success: true, downloadCount: file.download_count });
    }
    catch (error) {
        console.error('Increment download count error:', error);
        res.status(500).json({ message: 'Failed to update download count' });
    }
};
exports.incrementDownloadCount = incrementDownloadCount;
/**
 * Debug file status
 */
const debugFileStatus = async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!fileId) {
            res.status(400).json({ message: 'File ID is required' });
            return;
        }
        // Find file
        const file = await File_1.default.findById(fileId);
        if (!file) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        // Get chunks for this file
        const chunks = await FileChunk_1.default.find({ file: fileId }).sort({ chunk_index: 1 });
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
        const s3CheckPromises = chunks.map(async (chunk) => {
            try {
                if (!process.env.BACKBLAZE_BUCKET_NAME) {
                    return { path: chunk.storage_path, exists: false, error: "Bucket name not configured" };
                }
                const headParams = {
                    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
                    Key: chunk.storage_path
                };
                await storage_1.default.headObject(headParams).promise();
                return { path: chunk.storage_path, exists: true, error: null };
            }
            catch (error) {
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
            uploadedChunks: chunks.filter((c) => c.is_uploaded).length
        });
    }
    catch (error) {
        console.error('Debug file status error:', error);
        res.status(500).json({
            message: 'Failed to get file status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.debugFileStatus = debugFileStatus;
