import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'emergency_contacts',
})
export class EmergencyContact extends Document {
  @Prop({
    required: true,
    enum: ['organization', 'complex', 'clinic', 'patient'],
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop()
  relationship?: string; // 'manager', 'admin', 'owner', 'emergency_coordinator', etc.

  @Prop()
  alternativePhone?: string; // Secondary contact number

  @Prop()
  email?: string; // Emergency contact email

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPrimary: boolean; // Indicates if this is the primary emergency contact
}

export const EmergencyContactSchema =
  SchemaFactory.createForClass(EmergencyContact);

// Indexes
EmergencyContactSchema.index({ entityType: 1, entityId: 1 });
EmergencyContactSchema.index({ contactPhone: 1 });
EmergencyContactSchema.index({ email: 1 });
EmergencyContactSchema.index({ isActive: 1 });
EmergencyContactSchema.index({ isPrimary: 1 });
// Compound index for finding primary emergency contact for an entity
EmergencyContactSchema.index({ entityType: 1, entityId: 1, isPrimary: 1 });
// Compound index for active emergency contacts per entity
EmergencyContactSchema.index({ entityType: 1, entityId: 1, isActive: 1 });
