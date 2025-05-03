// Simple script to make a user an admin directly
// Usage: node direct-make-admin.js user@example.com

const mongoose = require('mongoose');
require('dotenv').config();

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide a user email');
  console.error('Usage: node direct-make-admin.js user@example.com');
  process.exit(1);
}

// Define a simple User schema matching our application
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  is_admin: Boolean
});

async function makeAdmin() {
  try {
    console.log(`Attempting to make user ${userEmail} an admin...`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database');
    
    // Get the User model
    const User = mongoose.model('User', UserSchema);
    
    // Find the user by email (case insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${userEmail}$`, 'i') } 
    });
    
    if (!user) {
      console.error(`User with email ${userEmail} not found in database`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current admin status: ${user.is_admin ? 'Is admin' : 'Not admin'}`);
    
    // Update to admin
    user.is_admin = true;
    await user.save();
    
    console.log(`✅ SUCCESS: User ${user.email} is now an admin`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
}

makeAdmin(); 