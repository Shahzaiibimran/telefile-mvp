"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageConfig = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Ensure environment variables are loaded
const { BACKBLAZE_BUCKET_NAME, BACKBLAZE_BUCKET_ID, BACKBLAZE_KEY_ID, BACKBLAZE_APPLICATION_KEY, BACKBLAZE_ENDPOINT } = process.env;
// Create an S3 service object
const s3 = new aws_sdk_1.default.S3({
    endpoint: BACKBLAZE_ENDPOINT,
    accessKeyId: BACKBLAZE_KEY_ID,
    secretAccessKey: BACKBLAZE_APPLICATION_KEY,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});
// Configuration object
exports.storageConfig = {
    s3,
    bucketName: BACKBLAZE_BUCKET_NAME || '',
    bucketId: BACKBLAZE_BUCKET_ID || '',
    chunkSize: 50 * 1024 * 1024, // 50MB chunk size
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB maximum file size
    defaultExpiry: 5 * 24 * 60 * 60 * 1000, // 5 days in milliseconds
};
exports.default = s3;
