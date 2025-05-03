// Simple script to demote an admin user to a regular user
// Usage: node direct-demote-admin.js user@example.com

const mongoose = require('mongoose');
require('dotenv').config();

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide a user email');
  console.error('Usage: node direct-demote-admin.js user@example.com');
  process.exit(1);
}

// Define a simple User schema matching our application
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  is_admin: Boolean
});

async function demoteAdmin() {
  try {
    console.log(`Attempting to demote user ${userEmail} from admin...`);
    
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
    
    if (!user.is_admin) {
      console.log(`User ${user.email} is already a regular user. No changes needed.`);
      process.exit(0);
    }
    
    // Update to regular user
    user.is_admin = false;
    await user.save();
    
    console.log(`✅ SUCCESS: User ${user.email} is now a regular user`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
}

demoteAdmin(); 