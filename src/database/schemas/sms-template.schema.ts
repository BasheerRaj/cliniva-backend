import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'sms_templates',
})
export class SmsTemplate extends Document {
  @Prop({ required: true, unique: true })
  templateName: string;

  @Prop({ required: true })
  messageText: string;

  @Prop({ type: Object })
  variables?: Record<string, any>; // List of available variables for the template

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const SmsTemplateSchema = SchemaFactory.createForClass(SmsTemplate);

// Indexes (templateName index is already created by unique: true in @Prop)
SmsTemplateSchema.index({ isActive: 1 });
