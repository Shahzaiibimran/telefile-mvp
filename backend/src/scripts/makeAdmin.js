const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function makeAdmin() {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('MONGODB_URI is not defined in the .env file');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    // Get email from command line arguments
    const email = process.argv[2];
    if (!email) {
      console.error('Please provide an email address as an argument');
      console.error('Usage: node makeAdmin.js user@example.com');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String,
      is_admin: Boolean
    }));
    
    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    // Set is_admin flag to true
    user.is_admin = true;
    await user.save();
    
    console.log(`✅ User ${email} has been promoted to admin status`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    process.exit(0);
  }
}

makeAdmin(); 