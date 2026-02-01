import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'patients',
})
export class Patient extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // Future: Link to user account for patient portal access

  @Prop({ required: true, unique: true })
  patientNumber: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({
    required: true,
    enum: ['male', 'female', 'other'],
  })
  gender: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactPhone?: string;

  @Prop()
  bloodType?: string; // A+, B-, O+, etc.

  @Prop()
  allergies?: string; // Known allergies

  @Prop()
  medicalHistory?: string; // Brief medical history

  @Prop()
  insuranceProvider?: string;

  @Prop()
  insurancePolicyNumber?: string;

  @Prop()
  nationality?: string;

  @Prop({ default: 'english' })
  preferredLanguage: string;

  @Prop({ default: false })
  isPortalEnabled: boolean; // Future: Enable patient portal access

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  deletedAt?: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Indexes
PatientSchema.index({ userId: 1 });
PatientSchema.index({ email: 1 });
PatientSchema.index({ phone: 1 });
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ deletedAt: 1 });
