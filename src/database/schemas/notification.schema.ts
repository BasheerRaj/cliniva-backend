import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'notifications'
})
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId?: Types.ObjectId; // NULL for system notifications

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    required: true,
    enum: [
      'appointment_reminder', 'appointment_cancelled', 'payment_due', 
      'test_results_ready', 'prescription_ready', 'system_maintenance', 
      'security_alert', 'general'
    ] 
  })
  notificationType: string;

  @Prop({ 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal' 
  })
  priority: string;

  @Prop({ enum: ['appointment', 'invoice', 'medical_report', 'patient', 'user'] })
  relatedEntityType?: string;

  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ 
    enum: ['in_app', 'email', 'sms', 'push'],
    default: 'in_app' 
  })
  deliveryMethod: string;

  @Prop({ 
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending' 
  })
  deliveryStatus: string;

  @Prop()
  scheduledFor?: Date; // For scheduled notifications
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ recipientId: 1 });
NotificationSchema.index({ notificationType: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ scheduledFor: 1 });
