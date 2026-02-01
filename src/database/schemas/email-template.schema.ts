import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'email_templates',
})
export class EmailTemplate extends Document {
  @Prop({ required: true, unique: true })
  templateName: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  bodyHtml: string;

  @Prop({ required: true })
  bodyText: string;

  @Prop({ type: Object })
  variables?: Record<string, any>; // List of available variables for the template

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);

// Indexes (templateName index is already created by unique: true in @Prop)
EmailTemplateSchema.index({ isActive: 1 });
