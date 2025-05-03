// This script tests file deletion directly using the fileService module
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Import our models and services
const File = require('./src/models/File');
const FileChunk = require('./src/models/FileChunk');
const User = require('./src/models/User');
const s3 = require('./src/config/storage');
const { deleteFile } = require('./src/services/fileService');

// Initialize temp file for testing
const testFilePath = path.join(__dirname, 'test-api-file.txt');
const testContent = 'This is a test file created at ' + new Date().toISOString();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test file creation helper (creates file directly in DB and S3)
const createTestFile = async (userId) => {
  try {
    console.log('Creating test file in database and S3...');
    
    // Create local file
    fs.writeFileSync(testFilePath, testContent);
    
    // Create file record in database
    const fileId = new ObjectId();
    const fileName = 'test-api-file.txt';
    const fileSize = fs.statSync(testFilePath).size;
    
    const file = await File.create({
      _id: fileId,
      name: fileName,
      size: fileSize,
      user: userId,
      mime_type: 'text/plain',
      share_link: `test-share-${Date.now()}`,
      expiry: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      is_uploaded: true
    });
    
    // Create chunk record
    const chunkId = new ObjectId();
    const storagePath = `${userId}/${fileId}/${fileName}_chunk0`;
    
    const chunk = await FileChunk.create({
      _id: chunkId,
      file: fileId,
      chunk_index: 0,
      size: fileSize,
      storage_path: storagePath,
      is_uploaded: true
    });
    
    // Upload file to S3
    const s3Client = s3.s3;
    const bucketName = s3.storageConfig.bucketName;
    
    const uploadParams = {
      Bucket: bucketName,
      Key: storagePath,
      Body: fs.createReadStream(testFilePath),
      ContentType: 'text/plain'
    };
    
    await s3Client.upload(uploadParams).promise();
    console.log(`Uploaded file to S3 at ${storagePath}`);
    
    return { fileId: fileId.toString(), storagePath };
  } catch (error) {
    console.error('Error creating test file:', error);
    throw error;
  }
};

// Check if file exists in S3
const checkFileInS3 = async (storagePath) => {
  try {
    const s3Client = s3.s3;
    const bucketName = s3.storageConfig.bucketName;
    
    const headParams = {
      Bucket: bucketName,
      Key: storagePath
    };
    
    try {
      await s3Client.headObject(headParams).promise();
      return true; // File exists
    } catch (error) {
      if (error.code === 'NotFound') {
        return false; // File does not exist
      }
      throw error;
    }
  } catch (error) {
    console.error('Error checking file in S3:', error);
    throw error;
  }
};

// Main test function
const runTest = async () => {
  try {
    console.log('======= STARTING API DELETION TEST =======');
    
    // Connect to DB
    await connectDB();
    
    // Find or create a test user
    let user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123', // In a real app, this should be hashed
        storage_used: 0,
        storage_limit: 1024 * 1024 * 100, // 100 MB
      });
      console.log('Created test user');
    }
    
    // Create a test file
    const { fileId, storagePath } = await createTestFile(user._id.toString());
    console.log(`Created test file with ID: ${fileId}`);
    
    // Verify file exists in S3
    const fileExistsBefore = await checkFileInS3(storagePath);
    if (fileExistsBefore) {
      console.log('Verified file exists in S3 bucket');
    } else {
      throw new Error('File was not found in S3 after upload!');
    }
    
    // Call the deleteFile function
    console.log('Calling deleteFile function...');
    await deleteFile(fileId, user._id.toString());
    console.log('deleteFile function completed successfully');
    
    // Verify file is deleted from S3
    const fileExistsAfter = await checkFileInS3(storagePath);
    if (!fileExistsAfter) {
      console.log('✅ TEST PASSED: File was properly deleted from S3 bucket');
    } else {
      console.log('❌ TEST FAILED: File still exists in S3 bucket after deletion');
    }
    
    // Check if file record is deleted from database
    const fileExists = await File.findById(fileId);
    if (!fileExists) {
      console.log('✅ TEST PASSED: File record was removed from database');
    } else {
      console.log('❌ TEST FAILED: File record still exists in database');
    }
    
    // Check if chunk records are deleted
    const chunksExist = await FileChunk.findOne({ file: fileId });
    if (!chunksExist) {
      console.log('✅ TEST PASSED: All chunk records were removed from database');
    } else {
      console.log('❌ TEST FAILED: Chunk records still exist in database');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log(`Deleted local test file: ${testFilePath}`);
      }
    } catch (err) {
      console.warn(`Warning: Could not delete local test file: ${err.message}`);
    }
    
    // Disconnect from MongoDB
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
};

// Run the test
runTest(); 