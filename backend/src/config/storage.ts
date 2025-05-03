import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

// Ensure environment variables are loaded
const {
  BACKBLAZE_BUCKET_NAME,
  BACKBLAZE_BUCKET_ID,
  BACKBLAZE_KEY_ID,
  BACKBLAZE_APPLICATION_KEY,
  BACKBLAZE_ENDPOINT
} = process.env;

// Validate that we have the required config
const missingConfig = [];
if (!BACKBLAZE_BUCKET_NAME) missingConfig.push('BACKBLAZE_BUCKET_NAME');
if (!BACKBLAZE_KEY_ID) missingConfig.push('BACKBLAZE_KEY_ID');
if (!BACKBLAZE_APPLICATION_KEY) missingConfig.push('BACKBLAZE_APPLICATION_KEY');
if (!BACKBLAZE_ENDPOINT) missingConfig.push('BACKBLAZE_ENDPOINT');

if (missingConfig.length > 0) {
  console.error(`Missing required storage configuration: ${missingConfig.join(', ')}`);
}

// Create a custom HTTPS agent with keep-alive for better performance
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 25,
  timeout: 30000  // 30 seconds
});

// Create an S3 service object with improved options
const s3 = new AWS.S3({
  endpoint: BACKBLAZE_ENDPOINT,
  accessKeyId: BACKBLAZE_KEY_ID,
  secretAccessKey: BACKBLAZE_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  maxRetries: 5,
  retryDelayOptions: {
    base: 300  // 300ms base retry delay
  },
  httpOptions: {
    agent: httpsAgent,
    connectTimeout: 10000, // 10 seconds
    timeout: 60000 // 60 seconds for large files
  }
});

// Configuration object
export const storageConfig = {
  s3,
  bucketName: BACKBLAZE_BUCKET_NAME || '',
  bucketId: BACKBLAZE_BUCKET_ID || '',
  chunkSize: 50 * 1024 * 1024, // 50MB chunk size
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB maximum file size
  defaultExpiry: 5 * 24 * 60 * 60 * 1000, // 5 days in milliseconds
};

// Add a startup test to verify bucket connectivity
export const verifyStorageConnection = async (): Promise<boolean> => {
  try {
    if (!BACKBLAZE_BUCKET_NAME) {
      console.error('Cannot verify storage connection: Bucket name not provided');
      return false;
    }
    
    console.log(`Verifying connection to storage bucket: ${BACKBLAZE_BUCKET_NAME}`);
    
    // Create a promise with timeout to avoid hanging
    const headBucketPromise = s3.headBucket({
      Bucket: BACKBLAZE_BUCKET_NAME
    }).promise();
    
    // Add timeout to avoid hanging if S3 is not responding
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Bucket verification timed out')), 10000); // 10 second timeout
    });
    
    // Race the promises
    await Promise.race([headBucketPromise, timeoutPromise]);
    
    console.log('✅ Successfully connected to storage bucket');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to storage bucket:', error);
    return false;
  }
};

export default s3; 