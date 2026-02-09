import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * DeviceInfo interface for tracking session device details
 */
export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  browser?: string;
  os?: string;
}

/**
 * Session Schema
 *
 * Tracks active user sessions with device information and expiration.
 * Used for session restoration and invalidation on critical changes.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
@Schema({
  timestamps: true,
  collection: 'sessions',
})
export class Session extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({
    type: {
      userAgent: { type: String, required: true },
      ipAddress: { type: String, required: true },
      browser: { type: String },
      os: { type: String },
    },
    required: true,
  })
  deviceInfo: DeviceInfo;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  invalidatedAt?: Date;

  @Prop()
  invalidationReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes

// Index on userId for fast user session lookup
SessionSchema.index({ userId: 1 });

// Unique index on token for fast token validation and prevent duplicates
SessionSchema.index({ token: 1 }, { unique: true });

// TTL index on expiresAt for automatic cleanup of expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for active session queries
SessionSchema.index({ isActive: 1, userId: 1 });

// Index on refreshToken for token refresh operations
SessionSchema.index({ refreshToken: 1 });
