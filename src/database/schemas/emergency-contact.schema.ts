import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'emergency_contacts'
})
export class EmergencyContact extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop()
  contactEmail?: string;

  @Prop({ 
    required: true,
    enum: ['spouse', 'parent', 'child', 'sibling', 'relative', 'friend', 'other']
  })
  relationship: string;

  @Prop()
  address?: string;

  @Prop({ default: true })
  isPrimary: boolean; // Primary emergency contact

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;
}

export const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);

// Indexes
EmergencyContactSchema.index({ userId: 1 });
EmergencyContactSchema.index({ userId: 1, isPrimary: 1 });
EmergencyContactSchema.index({ contactPhone: 1 });
