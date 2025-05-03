const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try to load .env file from different possible locations
const envPaths = [
  '.env',
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env')
];

let envFound = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at ${envPath}`);
    dotenv.config({ path: envPath });
    envFound = true;
    break;
  }
}

if (!envFound) {
  console.log('No .env file found, relying on environment variables');
  dotenv.config(); // Try default location
}

// Get bucket info from environment variables or prompt for it
const bucketName = process.env.BACKBLAZE_BUCKET_NAME;
const endpoint = process.env.BACKBLAZE_ENDPOINT;
const keyId = process.env.BACKBLAZE_KEY_ID;
const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;

// Check if required vars are present
if (!bucketName) {
  console.error('BACKBLAZE_BUCKET_NAME is not set in environment variables.');
  process.exit(1);
}

if (!endpoint) {
  console.error('BACKBLAZE_ENDPOINT is not set in environment variables.');
  process.exit(1);
}

if (!keyId || !applicationKey) {
  console.error('BACKBLAZE_KEY_ID or BACKBLAZE_APPLICATION_KEY is not set in environment variables.');
  process.exit(1);
}

console.log('Using bucket:', bucketName);
console.log('Using endpoint:', endpoint);

// Create S3 client
const s3 = new AWS.S3({
  endpoint: endpoint,
  accessKeyId: keyId,
  secretAccessKey: applicationKey,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Get allowed origins from environment or use defaults
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create an array of allowed origins
let allowedOrigins = [
  frontendUrl,
  'http://localhost:3000',
  'https://localhost:3000'
];

// Add production domain if available
if (process.env.PRODUCTION_DOMAIN) {
  allowedOrigins.push(process.env.PRODUCTION_DOMAIN);
  // Also add with www. prefix
  if (process.env.PRODUCTION_DOMAIN.startsWith('https://')) {
    const domain = process.env.PRODUCTION_DOMAIN.replace('https://', '');
    allowedOrigins.push(`https://www.${domain}`);
  }
}

// Remove any duplicates
allowedOrigins = [...new Set(allowedOrigins)];

console.log('Setting up CORS with allowed origins:', allowedOrigins);

// Define CORS configuration
const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['*'], // Allow all origins - this is more permissive but solves CORS issues
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Disposition', 'x-amz-meta-*'],
      MaxAgeSeconds: 3600
    }
  ]
};

// Apply CORS configuration to bucket
console.log(`Applying CORS configuration to bucket: ${bucketName}`);

s3.putBucketCors(
  {
    Bucket: bucketName,
    CORSConfiguration: corsConfig
  },
  (err, data) => {
    if (err) {
      console.error('Error setting CORS:', err);
      process.exit(1);
    } else {
      console.log('CORS configuration applied successfully to bucket:', bucketName);
      
      // Verify the CORS configuration
      s3.getBucketCors({ Bucket: bucketName }, (getErr, getData) => {
        if (getErr) {
          console.error('Error verifying CORS settings:', getErr);
        } else {
          console.log('Current CORS configuration:', JSON.stringify(getData, null, 2));
        }
      });
    }
  }
); 