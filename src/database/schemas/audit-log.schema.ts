import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditEventType } from '../../common/enums/audit-event-type.enum';

@Schema({
  timestamps: { createdAt: 'timestamp', updatedAt: false },
  collection: 'audit_logs'
})
export class AuditLog extends Document {
  @Prop({ 
    required: true,
    type: String,
    enum: Object.values(AuditEventType)
  })
  eventType: AuditEventType;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  email?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object, default: {} })
  details: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId?: Types.ObjectId;

  @Prop({ required: true, default: true })
  success: boolean;

  @Prop()
  errorCode?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Descending index on timestamp for efficient querying of recent logs
AuditLogSchema.index({ timestamp: -1 });

// Index on userId for user-specific audit queries
AuditLogSchema.index({ userId: 1 });

// Index on eventType for filtering by event type
AuditLogSchema.index({ eventType: 1 });

// Index on ipAddress for IP-based analysis and security monitoring
AuditLogSchema.index({ ipAddress: 1 });

// Compound index for common query patterns (user + event type)
AuditLogSchema.index({ userId: 1, eventType: 1 });

// Compound index for time-based queries with event type
AuditLogSchema.index({ timestamp: -1, eventType: 1 });
