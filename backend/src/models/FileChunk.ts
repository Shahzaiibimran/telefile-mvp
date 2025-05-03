import mongoose, { Document, Schema } from 'mongoose';
import { IFile } from './File';

export interface IFileChunk extends Document {
  file: IFile['_id'];
  chunk_index: number;
  storage_path: string;
  size: number;
  etag: string;
  is_uploaded: boolean;
  created_at: Date;
  updated_at: Date;
}

const FileChunkSchema: Schema = new Schema(
  {
    file: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      required: true,
    },
    chunk_index: {
      type: Number,
      required: true,
      min: 0,
    },
    storage_path: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    etag: {
      type: String,
      sparse: true,
    },
    is_uploaded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Create a compound index to ensure uniqueness of file and chunk_index
FileChunkSchema.index({ file: 1, chunk_index: 1 }, { unique: true });

export default mongoose.model<IFileChunk>('FileChunk', FileChunkSchema); 