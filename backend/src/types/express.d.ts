import { Request } from 'express';
import { IUser } from '../models/User';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    userId?: string;
    user?: IUser;
  }
}

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}