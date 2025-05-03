const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to properly encode MongoDB URI with special characters
function encodeMongoDBURI(uri) {
  // If the URI is already in the properly encoded format, return it
  if (uri.includes('%23') && uri.includes('%25') && uri.includes('%5E')) {
    return uri;
  }
  
  // Otherwise, encode the special characters
  const uriParts = uri.split('@');
  if (uriParts.length !== 2) return uri; // Not the expected format
  
  const authPart = uriParts[0];
  const hostPart = uriParts[1];
  
  const authPartsWithProtocol = authPart.split('://');
  if (authPartsWithProtocol.length !== 2) return uri; // Not the expected format
  
  const protocol = authPartsWithProtocol[0];
  const authInfo = authPartsWithProtocol[1];
  
  const authParts = authInfo.split(':');
  if (authParts.length !== 2) return uri; // Not the expected format
  
  const username = authParts[0];
  const password = encodeURIComponent(authParts[1]);
  
  return `${protocol}://${username}:${password}@${hostPart}`;
}

async function testConnection() {
  try {
    // Get MongoDB URI from environment variables
    let mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('MONGODB_URI is not defined in the .env file');
      process.exit(1);
    }
    
    // Ensure the URI is properly encoded
    mongoURI = encodeMongoDBURI(mongoURI);
    
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database connection details:');
    console.log(`- Host: ${mongoose.connection.host}`);
    console.log(`- Database Name: ${mongoose.connection.name}`);
    console.log(`- Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:');
    console.error(error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the test
testConnection(); 