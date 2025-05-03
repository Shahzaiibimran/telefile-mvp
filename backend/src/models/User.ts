import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  storage_used: number;
  google_id?: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    storage_used: {
      type: Number,
      default: 0,
      min: 0,
    },
    google_id: {
      type: String,
      sparse: true,
    },
    is_admin: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

UserSchema.pre('save', function(next) {
  if (this.is_admin === undefined || this.is_admin === null) {
    this.is_admin = false;
  }
  
  if (typeof this.is_admin !== 'boolean') {
    this.is_admin = Boolean(this.is_admin);
  }
  
  next();
});

export default mongoose.model<IUser>('User', UserSchema); 