require('dotenv').config();
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

async function listBucketFiles() {
  console.log(`Listing all files in bucket: ${bucketName}`);
  
  try {
    // List all objects in the bucket
    const data = await s3.listObjectsV2({ 
      Bucket: bucketName,
      MaxKeys: 1000 // Adjust this if you have more files
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
    
    if (data.IsTruncated) {
      console.log('Note: There are more files in the bucket. Modify MaxKeys parameter to retrieve more.');
    }
  } catch (error) {
    console.error('Error listing bucket files:', error);
  }
}

// Run the function
listBucketFiles(); 