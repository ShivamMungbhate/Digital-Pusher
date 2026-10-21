import mongoose, { Document, Schema, Types } from 'mongoose';

export type ShareLevel = 'summary' | 'summary_and_media';
export type AlertThreshold = 'medium' | 'high';
export type ConsentStatus = 'pending' | 'active' | 'revoked' | 'rejected';

export interface IConsent extends Document {
  seniorId: Types.ObjectId;
  familyId?: Types.ObjectId;
  inviteCode: string;
  inviteExpiresAt: Date;
  status: ConsentStatus;
  shareLevel: ShareLevel;
  alertThreshold: AlertThreshold;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentSchema = new Schema<IConsent>(
  {
    seniorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    inviteCode: { type: String, required: true, index: true },
    inviteExpiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'revoked', 'rejected'],
      default: 'pending',
      index: true
    },
    shareLevel: {
      type: String,
      enum: ['summary', 'summary_and_media'],
      default: 'summary'
    },
    alertThreshold: {
      type: String,
      enum: ['medium', 'high'],
      default: 'medium'
    },
    acceptedAt: { type: Date },
    revokedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

ConsentSchema.index({ seniorId: 1, familyId: 1 });
ConsentSchema.index({ createdAt: -1 });

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema);
