import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'audit_logs'
})
export class AuditLog extends Document {
  @Prop({ required: true })
  tableName: string;

  @Prop({ type: Types.ObjectId, required: true })
  recordId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['create', 'update', 'delete'] 
  })
  action: string;

  @Prop({ type: Object })
  oldValues?: Record<string, any>;

  @Prop({ type: Object })
  newValues?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes
AuditLogSchema.index({ tableName: 1, recordId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ createdAt: 1 });
