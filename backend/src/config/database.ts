import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telefile';
    console.log('Connecting to MongoDB at:', mongoURI.replace(/mongodb(\+srv)?:\/\/([^:]+:[^@]+@)?/, 'mongodb$1://***:***@'));
    
    // Configure mongoose connection
    mongoose.set('strictQuery', false);
    
    // Set connection options with timeouts
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      connectTimeoutMS: 10000,       // Timeout for initial connection
      socketTimeoutMS: 45000,        // Timeout for operations
      family: 4 // Forces IPv4
    };
    
    await mongoose.connect(mongoURI, options);
    
    console.log('MongoDB Connected Successfully');
    
    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, attempting to reconnect');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    // Instead of exiting, we'll throw the error to be handled by the caller
    throw error;
  }
};

export default connectDB; 