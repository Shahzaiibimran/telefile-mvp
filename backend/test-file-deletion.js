require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AWS = require('aws-sdk');
const FormData = require('form-data');

// S3 client setup
const s3 = new AWS.S3({
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  accessKeyId: process.env.BACKBLAZE_KEY_ID,
  secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// API endpoint
const API_URL = 'http://localhost:3001'; // Adjust if your API is on a different port

// Test user credentials (adjust these to a valid user in your system)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password123'
};

// Create a temporary test file
const createTestFile = () => {
  const testFilePath = path.join(__dirname, 'test-file.txt');
  const testContent = 'This is a test file created at ' + new Date().toISOString();
  fs.writeFileSync(testFilePath, testContent);
  return testFilePath;
};

// Login to get authentication token
const login = async () => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

// Upload a file
const uploadFile = async (filePath, token) => {
  try {
    console.log('Initializing file upload...');
    
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    // 1. Initialize upload
    const initResponse = await axios.post(
      `${API_URL}/api/files/initialize`,
      {
        fileName,
        fileSize,
        mimeType: 'text/plain',
        expiryDays: 1
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const fileId = initResponse.data.file._id;
    console.log(`File initialized with ID: ${fileId}`);
    
    // 2. Upload the file directly (since it's small)
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('chunkIndex', 0);
    formData.append('chunk', fs.createReadStream(filePath));
    
    await axios.post(
      `${API_URL}/api/files/upload-chunk`,
      formData,
      { 
        headers: { 
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}` 
        } 
      }
    );
    
    console.log('File chunk uploaded');
    
    // 3. Complete the upload
    await axios.post(
      `${API_URL}/api/files/complete-upload`,
      { fileId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('File upload completed');
    
    return fileId;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
};

// Delete the file
const deleteFile = async (fileId, token) => {
  try {
    console.log(`Deleting file with ID: ${fileId}`);
    await axios.delete(`${API_URL}/api/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('File deletion API call successful');
  } catch (error) {
    console.error('Deletion failed:', error.response?.data || error.message);
    throw error;
  }
};

// Check if the file exists in the bucket
const checkFileInBucket = async (fileId, userId) => {
  try {
    // The storage path format based on your code: userId/fileId/fileName_chunk0
    const prefix = `${userId}/${fileId}/`;
    
    console.log(`Checking if any objects with prefix ${prefix} exist in bucket...`);
    
    const listParams = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Prefix: prefix
    };
    
    const result = await s3.listObjectsV2(listParams).promise();
    
    if (result.Contents && result.Contents.length > 0) {
      console.log('FAIL: Found objects in bucket that should have been deleted:');
      result.Contents.forEach(item => {
        console.log(`- ${item.Key} (${item.Size} bytes)`);
      });
      return false;
    } else {
      console.log('SUCCESS: No objects found in bucket. File was properly deleted.');
      return true;
    }
  } catch (error) {
    console.error('Error checking bucket:', error);
    throw error;
  }
};

// Main test function
const runTest = async () => {
  try {
    console.log('======= STARTING FILE DELETION TEST =======');
    
    // Create test file
    const testFilePath = createTestFile();
    console.log(`Created test file: ${testFilePath}`);
    
    // Login
    const token = await login();
    console.log('Successfully logged in');
    
    // Get user ID from token (assuming JWT)
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const userId = payload.id || payload.userId || payload.sub;
    console.log(`Using user ID: ${userId}`);
    
    // Upload file
    const fileId = await uploadFile(testFilePath, token);
    
    // Wait a moment for potential async operations
    console.log('Waiting 2 seconds for any async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Delete file
    await deleteFile(fileId, token);
    
    // Wait a moment for potential async operations
    console.log('Waiting 2 seconds for any async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if file is really deleted
    const deletionSuccessful = await checkFileInBucket(fileId, userId);
    
    // Clean up
    try {
      fs.unlinkSync(testFilePath);
      console.log(`Deleted local test file: ${testFilePath}`);
    } catch (err) {
      console.warn(`Warning: Could not delete local test file: ${err.message}`);
    }
    
    // Test result
    if (deletionSuccessful) {
      console.log('✅ TEST PASSED: File was properly deleted from bucket');
    } else {
      console.log('❌ TEST FAILED: File was NOT properly deleted from bucket');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

// Run the test
runTest(); 