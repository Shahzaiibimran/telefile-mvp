require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// S3 client setup
const s3 = new AWS.S3({
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  accessKeyId: process.env.BACKBLAZE_KEY_ID,
  secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

// List all files in the bucket
async function listBucketFiles() {
  console.log(`\nListing all files in bucket: ${bucketName}`);
  
  try {
    const data = await s3.listObjectsV2({ 
      Bucket: bucketName,
      MaxKeys: 1000
    }).promise();
    
    if (data.Contents && data.Contents.length > 0) {
      console.log(`Found ${data.Contents.length} files in bucket:`);
      console.log('\n---------------------');
      
      // Sort by LastModified date (newest first)
      data.Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
      
      data.Contents.forEach((object, index) => {
        const sizeInKB = (object.Size / 1024).toFixed(2);
        const date = new Date(object.LastModified).toLocaleString();
        console.log(`${index + 1}. Key: ${object.Key}`);
        console.log(`   Size: ${sizeInKB} KB`);
        console.log(`   Last Modified: ${date}`);
        console.log('---------------------');
      });
    } else {
      console.log('No files found in the bucket.');
    }
  } catch (error) {
    console.error('Error listing bucket files:', error);
  }
}

// Upload a test file to the bucket
async function uploadTestFile() {
  console.log(`\nUploading test file to bucket: ${bucketName}`);
  
  // Create a test file
  const testFilePath = path.join(__dirname, 'test-upload-file.txt');
  const testKey = `test-upload-${Date.now()}.txt`;
  const testContent = 'This is a test file created at ' + new Date().toISOString();
  
  try {
    // Create local file
    fs.writeFileSync(testFilePath, testContent);
    console.log(`Created local test file: ${testFilePath}`);
    
    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: testKey,
      Body: fs.createReadStream(testFilePath),
      ContentType: 'text/plain'
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`File uploaded successfully to: ${uploadResult.Key}`);
    console.log(`ETag: ${uploadResult.ETag}`);
    
    return { key: testKey, path: testFilePath };
  } catch (error) {
    console.error('Error uploading test file:', error);
    throw error;
  }
}

// Delete a file from the bucket
async function deleteFile(key) {
  console.log(`\nDeleting file from bucket: ${key}`);
  
  try {
    await s3.deleteObject({
      Bucket: bucketName,
      Key: key
    }).promise();
    console.log('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// Main function
async function run() {
  try {
    console.log('=== INITIAL BUCKET STATE ===');
    await listBucketFiles();
    
    console.log('\n=== UPLOADING TEST FILE ===');
    const { key, path: filePath } = await uploadTestFile();
    
    console.log('\n=== BUCKET STATE AFTER UPLOAD ===');
    await listBucketFiles();
    
    // Ask user if they want to delete the file
    console.log('\nFile has been uploaded. You can now test the deletion functionality.');
    console.log('To delete the file, run this command:');
    console.log(`node test-upload-list.js delete ${key}`);
    
    // Clean up local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`\nDeleted local test file: ${filePath}`);
    }
    
    // Check for command-line arguments
    if (process.argv.length > 2 && process.argv[2] === 'delete' && process.argv[3]) {
      const keyToDelete = process.argv[3];
      await deleteFile(keyToDelete);
      
      console.log('\n=== BUCKET STATE AFTER DELETION ===');
      await listBucketFiles();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
run(); 