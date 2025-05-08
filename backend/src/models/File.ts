import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  size: number;
  user: IUser['_id'];
  share_link: string;
  download_count: number;
  expiry: Date;
  mime_type: string;
  is_uploaded: boolean;
  created_at: Date;
  updated_at: Date;
}

const FileSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    share_link: {
      type: String,
      required: true,
      unique: true,
    },
    download_count: {
      type: Number,
      default: 0,
    },
    expiry: {
      type: Date,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    is_uploaded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Generate a default expiry date 5 days from now if not provided
FileSchema.pre('save', function(next) {
  if (!this.expiry) {
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    this.expiry = fiveDaysFromNow;
  }
  next();
});

export default mongoose.model<IFile>('File', FileSchema); 