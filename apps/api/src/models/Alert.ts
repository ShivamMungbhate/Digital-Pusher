import mongoose, { Document, Schema, Types } from 'mongoose';

export type AlertStatus = 'unread' | 'handled';

export interface ISentChannel {
  channel: 'telegram' | 'email' | 'sms';
  status: 'sent' | 'failed';
  sentAt: Date;
  error?: string;
}

export interface IAlert extends Document {
  seniorId: Types.ObjectId;
  familyId: Types.ObjectId;
  submissionId: Types.ObjectId;
  analysisId?: Types.ObjectId;
  risk: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  suggestedAction: string;
  mediaIncluded: boolean;
  mediaUrl?: string;
  channelsSent: ISentChannel[];
  status: AlertStatus;
  handledNote?: string;
  handledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    seniorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis' },
    risk: { type: String, enum: ['low', 'medium', 'high'], required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    suggestedAction: { type: String, required: true },
    mediaIncluded: { type: Boolean, default: false },
    mediaUrl: { type: String },
    channelsSent: [
      {
        channel: { type: String, enum: ['telegram', 'email', 'sms'], required: true },
        status: { type: String, enum: ['sent', 'failed'], required: true },
        sentAt: { type: Date, default: Date.now },
        error: { type: String }
      }
    ],
    status: {
      type: String,
      enum: ['unread', 'handled'],
      default: 'unread',
      index: true
    },
    handledNote: { type: String },
    handledAt: { type: Date }
  },
  {
    timestamps: true
  }
);

AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ seniorId: 1, createdAt: -1 });
AlertSchema.index({ familyId: 1, status: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
