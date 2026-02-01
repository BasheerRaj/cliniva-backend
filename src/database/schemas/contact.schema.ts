import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'contacts',
})
export class Contact extends Document {
  @Prop({
    required: true,
    enum: ['organization', 'complex', 'clinic', 'user'],
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ required: true })
  contactType: string; // 'facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp', etc.

  @Prop({ required: true })
  contactValue: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Indexes
ContactSchema.index({ entityType: 1, entityId: 1 });
ContactSchema.index({ contactType: 1 });
