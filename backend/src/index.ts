import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import connectDB from './config/database';
import { setupPassport } from './config/auth';
import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import adminRoutes from './routes/adminRoutes';
import fileUpload from 'express-fileupload';
import { storageConfig, verifyStorageConnection } from './config/storage';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();
console.log('Starting application...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set (value hidden)' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set (value hidden)' : 'Not set',
  FRONTEND_URL: process.env.FRONTEND_URL,
});

// Initialize Express app
const app = express();

// Add uncaught exception handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', error);
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (error: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', error);
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'], // Expose headers for download
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Increase JSON body size limit
app.use(express.json({ limit: '50mb' }));

// Increase URL-encoded body size limit
app.use(express.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

// Configure file upload middleware with proper limits
// Do NOT add this middleware here - it will be added in fileRoutes
// app.use(fileUpload({
//   limits: { 
//     fileSize: storageConfig.maxFileSize, // Use the same max file size as defined in storage config
//   },
//   abortOnLimit: true,
//   useTempFiles: true,
//   tempFileDir: '/tmp/',
//   debug: process.env.NODE_ENV === 'development'
// }));

// Add express-session middleware
app.use(session({
  secret: process.env.JWT_SECRET || 'default_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Define error handler
interface ErrorWithStatus extends Error {
  status?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  console.error('Express error handler caught error:', err);
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API root route
app.get('/api', (req: Request, res: Response) => {
  res.send('TeleFile API is running');
});

// Check various static file paths
const possibleStaticPaths = [
  path.join(__dirname, '../../static'),       // /production/static
  path.join(__dirname, '../../../static'),    // /static
  path.join(process.cwd(), '../static'),      // Relative from backend directory
  path.join(process.cwd(), '/static'),        // Absolute from backend directory
  '/production/static',                       // Docker container path
  '/app/static'                               // Original Docker path
];

// Find the first valid static path
let staticFilesPath = null;
for (const testPath of possibleStaticPaths) {
  console.log(`Checking static path: ${testPath}`);
  try {
    if (fs.existsSync(testPath)) {
      console.log(`Found valid static path: ${testPath}`);
      staticFilesPath = testPath;
      break;
    }
  } catch (error) {
    console.error(`Error checking static path ${testPath}:`, error);
  }
}

if (staticFilesPath) {
  console.log(`Using static files path: ${staticFilesPath}`);
  try {
    const files = fs.readdirSync(staticFilesPath);
    console.log('Static files directory contents:', files);
    
    // Serve static files from the frontend
    app.use(express.static(staticFilesPath));
    
    // For all other routes, serve the index.html file
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API endpoint not found' });
      }
      
      const indexPath = path.join(staticFilesPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error('index.html not found at path:', indexPath);
        res.status(404).send('Frontend not found');
      }
    });
  } catch (error) {
    console.error('Error reading static files directory:', error);
  }
} else {
  console.warn('No valid static files directory found');
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      res.status(404).send('Frontend not available');
    } else {
      next();
    }
  });
}

// Start server and connect to database
const PORT = process.env.PORT || 5000;

// Try to connect to database but don't fail if it doesn't connect
const startApp = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    // Setup passport after database connection
    try {
      console.log('Setting up passport...');
      setupPassport();
      console.log('Passport setup complete');
    } catch (passportError) {
      console.error('Failed to setup passport:', passportError);
      // Continue without passport if it fails
    }
    
    // Verify storage connection
    try {
      console.log('Verifying storage connection...');
      const storageConnected = await verifyStorageConnection();
      if (!storageConnected) {
        console.warn('⚠️ WARNING: Storage connection failed, file uploads and downloads may not work');
      }
    } catch (storageError) {
      console.error('Error verifying storage connection:', storageError);
      console.warn('⚠️ WARNING: Storage verification failed, file uploads and downloads may not work');
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (dbError) {
    console.error('Database connection failed:', dbError);
    // Still start the server even if DB connection fails
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (without database)`);
    });
  }
};

startApp(); 