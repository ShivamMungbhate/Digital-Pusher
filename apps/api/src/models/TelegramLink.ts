import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITelegramLink extends Document {
  userId: Types.ObjectId;
  chatId?: string;
  linkCode?: string;
  linkCodeExpiresAt?: Date;
  isLinked: boolean;
  username?: string;
  firstName?: string;
  createdAt: Date;
  linkedAt?: Date;
}

const TelegramLinkSchema = new Schema<ITelegramLink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    chatId: { type: String, index: true },
    linkCode: { type: String, index: true },
    linkCodeExpiresAt: { type: Date },
    isLinked: { type: Boolean, default: false, index: true },
    username: { type: String },
    firstName: { type: String },
    linkedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

TelegramLinkSchema.index({ createdAt: -1 });

export const TelegramLink = mongoose.model<ITelegramLink>('TelegramLink', TelegramLinkSchema);
