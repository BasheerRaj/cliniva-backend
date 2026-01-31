import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: false,
  collection: 'rate_limit_counters'
})
export class RateLimitCounter extends Document {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, default: 0 })
  count: number;

  @Prop({ required: true })
  windowStart: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const RateLimitCounterSchema = SchemaFactory.createForClass(RateLimitCounter);

// Unique index on key for fast lookup and prevent duplicates
RateLimitCounterSchema.index({ key: 1 }, { unique: true });

// TTL index on expiresAt for automatic cleanup of expired counters
RateLimitCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
