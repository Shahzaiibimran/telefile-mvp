import { Express } from 'express-serve-static-core';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface User extends IUser {}
    
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
      userId?: string;
    }
  }
}