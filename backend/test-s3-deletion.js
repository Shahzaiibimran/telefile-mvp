require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// S3 client setup
const s3 = new AWS.S3({
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  accessKeyId: process.env.BACKBLAZE_KEY_ID,
  secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

// Create a temporary test file
const testFilePath = path.join(__dirname, 'test-file.txt');
const testKey = `test-deletion-${Date.now()}.txt`;
const testContent = 'This is a test file created at ' + new Date().toISOString();

// Main test function
const runTest = async () => {
  try {
    console.log('======= STARTING S3 DELETION TEST =======');
    console.log(`Using bucket: ${bucketName}`);
    
    // 1. Create a local test file
    fs.writeFileSync(testFilePath, testContent);
    console.log(`Created local test file: ${testFilePath}`);
    
    // 2. Upload the file to S3
    console.log(`Uploading file to S3 with key: ${testKey}...`);
    const uploadParams = {
      Bucket: bucketName,
      Key: testKey,
      Body: fs.createReadStream(testFilePath),
      ContentType: 'text/plain'
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`File uploaded successfully. ETag: ${uploadResult.ETag}`);
    
    // 3. Verify the file exists in the bucket
    console.log('Checking if file exists in bucket...');
    const headParams = {
      Bucket: bucketName,
      Key: testKey
    };
    
    try {
      const headResult = await s3.headObject(headParams).promise();
      console.log(`File exists in bucket. Size: ${headResult.ContentLength} bytes`);
    } catch (error) {
      console.error(`File doesn't exist in bucket after upload! Error: ${error}`);
      throw new Error('File upload verification failed');
    }
    
    // 4. Delete the file from S3
    console.log('Deleting file from bucket...');
    const deleteParams = {
      Bucket: bucketName,
      Key: testKey
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log('Delete API call completed');
    
    // 5. Verify the file is deleted
    console.log('Verifying file is deleted from bucket...');
    try {
      await s3.headObject(headParams).promise();
      console.log('❌ TEST FAILED: File still exists in bucket after deletion!');
      return false;
    } catch (error) {
      if (error.code === 'NotFound') {
        console.log('✅ TEST PASSED: File was properly deleted from bucket');
        return true;
      } else {
        console.error(`Error checking file deletion: ${error.code}`);
        throw error;
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  } finally {
    // Clean up the local test file
    try {
      fs.unlinkSync(testFilePath);
      console.log(`Deleted local test file: ${testFilePath}`);
    } catch (err) {
      console.warn(`Warning: Could not delete local test file: ${err.message}`);
    }
  }
};

// Run the test
runTest(); 