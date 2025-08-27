import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'access_logs'
})
export class AccessLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['login', 'logout', 'access_attempt', 'permission_denied', 'session_expired', 'password_change', 'role_change', 'failed_login', 'suspicious_activity', 'api_access', 'data_access', 'system_access']
  })
  eventType: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop()
  sessionId?: string;

  @Prop({ 
    enum: ['success', 'failure', 'blocked', 'warning'],
    default: 'success'
  })
  status: string;

  @Prop()
  resource?: string; // What resource was accessed (e.g., '/patients', '/appointments')

  @Prop()
  method?: string; // HTTP method (GET, POST, PUT, DELETE)

  @Prop()
  statusCode?: number; // HTTP status code

  @Prop()
  responseTime?: number; // Response time in milliseconds

  @Prop()
  location?: string; // Geolocation or city/country

  @Prop()
  deviceType?: string; // mobile, desktop, tablet

  @Prop()
  browser?: string;

  @Prop()
  operatingSystem?: string;

  @Prop({ type: Object })
  requestData?: Record<string, any>; // Request payload (sanitized)

  @Prop()
  errorMessage?: string;

  @Prop()
  riskScore?: number; // Security risk score (0-100)

  @Prop({ 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  })
  riskLevel: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop()
  duration?: number; // Session duration in seconds (for logout events)

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>; // Additional flexible data

  @Prop({ default: false })
  flaggedForReview: boolean;

  @Prop()
  notes?: string;

  createdAt?: Date;
}

export const AccessLogSchema = SchemaFactory.createForClass(AccessLog);

// Comprehensive indexes for performance and security queries
AccessLogSchema.index({ userId: 1, createdAt: -1 });
AccessLogSchema.index({ eventType: 1, createdAt: -1 });
AccessLogSchema.index({ ipAddress: 1, createdAt: -1 });
AccessLogSchema.index({ sessionId: 1 });
AccessLogSchema.index({ status: 1, createdAt: -1 });
AccessLogSchema.index({ riskLevel: 1, createdAt: -1 });
AccessLogSchema.index({ flaggedForReview: 1 });
AccessLogSchema.index({ organizationId: 1, createdAt: -1 });
AccessLogSchema.index({ clinicId: 1, createdAt: -1 });
AccessLogSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
AccessLogSchema.index({ ipAddress: 1, userId: 1, createdAt: -1 });
AccessLogSchema.index({ createdAt: -1 }); // For general time-based queries 