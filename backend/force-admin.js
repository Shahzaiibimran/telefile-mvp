/**
 * Emergency admin access script
 * This script will directly update the database to set a user as admin.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// User email to make admin
const EMAIL = 'ali.rahabi@gmail.com';

async function makeAdmin() {
  try {
    console.log(`Starting emergency admin access script for ${EMAIL}`);
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database successfully!');
    
    // Define a bare minimum User model for our operation
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String,
      is_admin: mongoose.Schema.Types.Mixed  // Can be boolean or undefined
    }));
    
    // Find the user by email
    console.log(`Searching for user: ${EMAIL}`);
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } 
    });
    
    if (!user) {
      console.error(`User not found: ${EMAIL}`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current admin status: ${user.is_admin}`);
    console.log(`Admin status type: ${typeof user.is_admin}`);
    
    // Use findOneAndUpdate with explicit $set operator to ensure the field is set properly
    console.log('Updating user to admin status...');
    const result = await User.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } },
      { $set: { is_admin: true } },  // Explicitly use $set and true boolean
      { new: true }
    );
    
    if (!result) {
      console.error('Failed to update user');
      process.exit(1);
    }
    
    console.log(`✅ ADMIN ACCESS GRANTED: ${result.name} (${result.email})`);
    console.log(`New admin status: ${result.is_admin}`);
    console.log(`New admin status type: ${typeof result.is_admin}`);
    
    // Force a direct MongoDB update command for maximum reliability
    console.log('Performing direct MongoDB update command...');
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    const updateResult = await collection.updateOne(
      { email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } },
      { $set: { is_admin: true } }
    );
    
    console.log(`MongoDB update result: ${JSON.stringify(updateResult)}`);
    console.log('✅ EMERGENCY ADMIN ACCESS SCRIPT COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

makeAdmin(); 