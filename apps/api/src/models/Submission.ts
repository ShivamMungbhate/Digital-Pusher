import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubmissionMode = 'auto' | 'scam' | 'dark_pattern' | 'paperwork';
export type SubmissionStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface ISubmission extends Document {
  userId: Types.ObjectId;
  mode: SubmissionMode;
  language: string;
  sourceType: 'text' | 'audio' | 'video' | 'image' | 'pdf';
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  storageKey?: string;
  isEncrypted: boolean;
  rawTextMasked?: string;
  status: SubmissionStatus;
  retryCount: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: {
      type: String,
      enum: ['auto', 'scam', 'dark_pattern', 'paperwork'],
      default: 'auto'
    },
    language: { type: String, default: 'en' },
    sourceType: {
      type: String,
      enum: ['text', 'audio', 'video', 'image', 'pdf'],
      required: true
    },
    originalFileName: { type: String },
    mimeType: { type: String },
    fileSizeBytes: { type: Number },
    storageKey: { type: String },
    isEncrypted: { type: Boolean, default: false },
    rawTextMasked: { type: String },
    status: {
      type: String,
      enum: ['queued', 'processing', 'done', 'failed'],
      default: 'queued',
      index: true
    },
    retryCount: { type: Number, default: 0 },
    error: { type: String }
  },
  {
    timestamps: true
  }
);

SubmissionSchema.index({ createdAt: -1 });
SubmissionSchema.index({ userId: 1, status: 1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
