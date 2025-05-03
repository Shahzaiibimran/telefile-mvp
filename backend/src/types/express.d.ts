import { Express } from 'express-serve-static-core';
import { IUser } from '../models/User';

// Extend Express Request interface to include Multer file
declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
    user?: IUser;
    userId?: string;
  }
} 