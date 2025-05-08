import { Express } from 'express-serve-static-core';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    // Extend the User interface with your IUser properties
    interface User extends IUser {}
    
    // Extend the Request interface
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
      userId?: string; // Explicitly declare userId
    }
  }
}