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

  @Prop({ required: true, unique: true })
  cardNumber: string; // From m5.json business rules

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

  @Prop({
    required: true,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  })
  status: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  @Prop()
  nationality?: string;

  @Prop({
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
  })
  maritalStatus?: string;

  @Prop()
  religion?: string;

  @Prop({ default: 'english' })
  preferredLanguage: string;

  @Prop()
  profilePicture?: string;

  @Prop([String])
  documents?: string[];

  // Emergency Contact Information
  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactPhone?: string;

  @Prop()
  emergencyContactRelationship?: string;

  @Prop()
  bloodType?: string; // A+, B-, O+, etc.

  @Prop()
  allergies?: string; // Known allergies

  @Prop()
  medicalHistory?: string; // Brief medical history

  // Insurance Information (Expanded from m5.json)
  @Prop()
  insuranceCompany?: string;

  @Prop()
  insuranceMemberNumber?: string;

  @Prop()
  insuranceMemberType?: string;

  @Prop()
  insuranceProviderNetwork?: string;

  @Prop()
  insurancePolicyId?: string;

  @Prop()
  insuranceClass?: string;

  @Prop()
  insuranceCoPayment?: number;

  @Prop()
  insuranceCoverageLimit?: number;

  @Prop()
  insuranceStartDate?: Date;

  @Prop()
  insuranceEndDate?: Date;

  @Prop({
    enum: ['Active', 'Expired', 'Pending', 'None'],
    default: 'None',
  })
  insuranceStatus?: string;

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
PatientSchema.index({ cardNumber: 1 }, { unique: true });
PatientSchema.index({ patientNumber: 1 }, { unique: true });
PatientSchema.index({ email: 1 });
PatientSchema.index({ phone: 1 });
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ status: 1 });
PatientSchema.index({ deletedAt: 1 });
