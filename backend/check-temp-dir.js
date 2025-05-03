const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get temp directory from env or use default
const tempDir = process.env.TEMP_UPLOAD_DIR || './tmp/';

console.log(`Checking temporary directory: ${tempDir}`);

// Make sure the directory exists
try {
  if (!fs.existsSync(tempDir)) {
    console.log(`Temp directory does not exist, creating it...`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory at ${tempDir}`);
  } else {
    console.log(`Temp directory exists at ${tempDir}`);
  }
} catch (error) {
  console.error(`Error creating temp directory: ${error.message}`);
  process.exit(1);
}

// Check if the directory is writable
try {
  const testFile = path.join(tempDir, `test-${Date.now()}.txt`);
  fs.writeFileSync(testFile, 'Test file write');
  console.log(`Successfully wrote test file to ${testFile}`);
  
  // Clean up the test file
  fs.unlinkSync(testFile);
  console.log(`Successfully deleted test file`);
  
  console.log(`✅ Temp directory is writable and ready for use!`);
} catch (error) {
  console.error(`Error writing to temp directory: ${error.message}`);
  console.error(`Make sure the application has write permissions to ${tempDir}`);
  process.exit(1);
} 