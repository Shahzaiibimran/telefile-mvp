require('dotenv').config();
const AWS = require('aws-sdk');

// Get S3 credentials from environment
const {
  BACKBLAZE_BUCKET_NAME,
  BACKBLAZE_KEY_ID,
  BACKBLAZE_APPLICATION_KEY,
  BACKBLAZE_ENDPOINT
} = process.env;

console.log('Testing S3 connection with the following configuration:');
console.log('Bucket name:', BACKBLAZE_BUCKET_NAME);
console.log('Endpoint:', BACKBLAZE_ENDPOINT);
console.log('Key ID:', BACKBLAZE_KEY_ID ? '✓ Set' : '✗ Not set');
console.log('Application Key:', BACKBLAZE_APPLICATION_KEY ? '✓ Set' : '✗ Not set');

// Create S3 client
const s3 = new AWS.S3({
  endpoint: BACKBLAZE_ENDPOINT,
  accessKeyId: BACKBLAZE_KEY_ID,
  secretAccessKey: BACKBLAZE_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Test uploading a small file
async function testUpload() {
  console.log('\n=== Testing bucket listing ===');
  try {
    const listResult = await s3.listBuckets().promise();
    console.log('Buckets list success:', listResult.Buckets.map(b => b.Name).join(', '));
    
    console.log('\n=== Testing bucket access ===');
    try {
      const listObjectsResult = await s3.listObjects({
        Bucket: BACKBLAZE_BUCKET_NAME,
        MaxKeys: 5
      }).promise();
      
      console.log('List objects success. Objects found:', listObjectsResult.Contents ? listObjectsResult.Contents.length : 0);
      if (listObjectsResult.Contents && listObjectsResult.Contents.length > 0) {
        console.log('Sample objects:');
        listObjectsResult.Contents.forEach(obj => {
          console.log(`- Key: ${obj.Key}, Size: ${obj.Size} bytes, LastModified: ${obj.LastModified}`);
        });
      }
      
      console.log('\n=== Testing file upload ===');
      const testBuffer = Buffer.from('This is a test file for S3 connection', 'utf8');
      const testKey = `test-file-${Date.now()}.txt`;
      
      try {
        const uploadResult = await s3.upload({
          Bucket: BACKBLAZE_BUCKET_NAME,
          Key: testKey,
          Body: testBuffer,
          ContentType: 'text/plain'
        }).promise();
        
        console.log('Upload success!');
        console.log('ETag:', uploadResult.ETag);
        console.log('Location:', uploadResult.Location);
        
        console.log('\n=== Testing file deletion ===');
        try {
          await s3.deleteObject({
            Bucket: BACKBLAZE_BUCKET_NAME,
            Key: testKey
          }).promise();
          
          console.log('Delete success!');
          console.log('\n✅ All tests passed! Your S3 connection is working correctly.');
        } catch (deleteError) {
          console.error('Error deleting test file:', deleteError);
        }
      } catch (uploadError) {
        console.error('Error uploading test file:', uploadError);
      }
    } catch (listError) {
      console.error('Error listing objects in bucket:', listError);
    }
  } catch (error) {
    console.error('Error listing buckets:', error);
  }
}

testUpload().catch(error => {
  console.error('Test failed with error:', error);
}); 