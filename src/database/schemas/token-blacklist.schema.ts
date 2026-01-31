import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: 'blacklistedAt', updatedAt: false },
  collection: 'token_blacklist'
})
export class TokenBlacklist extends Document {
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true })
  blacklistedAt: Date;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId?: Types.ObjectId;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// Indexes
// Unique index on tokenHash for fast lookup and prevent duplicates
TokenBlacklistSchema.index({ tokenHash: 1 }, { unique: true });

// TTL index on expiresAt for automatic cleanup of expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index on userId for user-specific queries
TokenBlacklistSchema.index({ userId: 1 });
