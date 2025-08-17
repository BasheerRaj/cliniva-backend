import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'clinics'
})
export class Clinic extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ComplexDepartment' })
  complexDepartmentId?: Types.ObjectId; // NULL for clinic-only plans

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId; // Direct link for clinic plans

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop()
  googleLocation?: string; // Google Maps location/coordinates

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  licenseNumber?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  website?: string;

  @Prop()
  headDoctorName?: string;

  @Prop()
  specialization?: string;

  @Prop()
  pin?: string; // Clinic PIN/identifier

  @Prop([String])
  serviceIds?: string[]; // Array of service IDs offered by this clinic

  // General Information (for Clinic Plan)
  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  ceoName?: string;

  // Legal Details (for Clinic Plan)
  @Prop()
  vatNumber?: string; // VAT registration number

  @Prop()
  crNumber?: string; // Commercial registration number

  // Capacity Information
  @Prop()
  maxStaff?: number; // Maximum staff capacity

  @Prop()
  maxDoctors?: number; // Maximum doctors capacity

  @Prop()
  maxPatients?: number; // Maximum patients capacity

  // Operational Details
  @Prop()
  sessionDuration?: number; // Default session duration in minutes
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);

// Indexes
ClinicSchema.index({ complexDepartmentId: 1 });
ClinicSchema.index({ subscriptionId: 1 });
ClinicSchema.index({ name: 1 });
ClinicSchema.index({ email: 1 });
ClinicSchema.index({ licenseNumber: 1 });
ClinicSchema.index({ pin: 1 });
ClinicSchema.index({ vatNumber: 1 });
ClinicSchema.index({ crNumber: 1 });
