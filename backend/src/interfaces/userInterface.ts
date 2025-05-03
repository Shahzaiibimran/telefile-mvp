import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  storage_used: number;
  google_id?: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
} 