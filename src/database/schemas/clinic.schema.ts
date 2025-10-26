import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PhoneNumber, Address, OrganizationEmergencyContact, SocialMediaLinks, LegalDocument } from './organization.schema';

@Schema({
  timestamps: true,
  collection: 'clinics'
})
export class Clinic extends Document {
  // Relationships
  @Prop({ type: Types.ObjectId, ref: 'ComplexDepartment' })
  complexDepartmentId?: Types.ObjectId; // NULL for clinic-only plans

  @Prop({ type: Types.ObjectId, ref: 'Complex' })
  complexId?: Types.ObjectId; // Direct reference to complex

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId; // For traceability

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId; // Direct link for clinic plans

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  // Basic information
  @Prop({ required: true })
  name: string;

  @Prop()
  headDoctorName?: string;

  @Prop()
  specialization?: string;

  @Prop()
  licenseNumber?: string;

  @Prop()
  pin?: string; // Clinic PIN/identifier

  @Prop()
  logoUrl?: string;

  @Prop()
  website?: string;

  @Prop()
  description?: string;

  // Business information - STANDARDIZED
  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  overview?: string; // Clinic overview/description

  @Prop()
  goals?: string; // Clinic goals

  @Prop()
  ceoName?: string; // or Clinic Director

  // Contact information - SAME AS ORGANIZATION
  @Prop({
    type: [{
      number: { type: String, required: true },
      type: {
        type: String,
        enum: ['primary', 'secondary', 'emergency', 'fax', 'mobile'],
        default: 'primary'
      },
      label: String
    }],
    default: []
  })
  phoneNumbers?: PhoneNumber[];

  @Prop()
  email?: string;

  // Address - UPDATE TO STRUCTURED FORMAT
  @Prop({
    type: {
      street: String,
      country: String,
      googleLocation: String,
      region: String,
      nation: String,
      buildingNumber: Number
    }
  })
  address?: Address;

  // Emergency contact - UPDATE TO STRUCTURED FORMAT
  @Prop({
    type: {
      name: String,
      phone: String,
      email: String,
      relationship: String
    }
  })
  emergencyContact?: OrganizationEmergencyContact;

  // Social media - UPDATE TO OBJECT (not Map)
  @Prop({
    type: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    }
  })
  socialMediaLinks?: SocialMediaLinks;

  // Legal information - STANDARDIZED
  @Prop()
  vatNumber?: string;

  @Prop()
  crNumber?: string; // Commercial registration number

@Prop({
    type: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
    }],
    default: []
  })
  termsAndConditions?: LegalDocument[];

  // 🆕 Privacy Policies - Array من المستندات
  @Prop({
    type: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
    }],
    default: []
  })
  privacyPolicies?: LegalDocument[];


  // Clinic-specific fields
  // Services are managed through ClinicService junction table only

  // Capacity settings - SET DEFAULTS to avoid frontend errors
  @Prop({ default: 50 })
  maxStaff?: number;

  @Prop({ default: 10 })
  maxDoctors?: number;

  @Prop({ default: 1000 })
  maxPatients?: number;

  @Prop({ default: 30 })
  sessionDuration?: number;
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);

// Indexes
ClinicSchema.index({ complexDepartmentId: 1 });
ClinicSchema.index({ complexId: 1 });
ClinicSchema.index({ organizationId: 1 });
ClinicSchema.index({ subscriptionId: 1 });
ClinicSchema.index({ ownerId: 1 });
ClinicSchema.index({ name: 1 });
ClinicSchema.index({ email: 1 });
ClinicSchema.index({ licenseNumber: 1 });
ClinicSchema.index({ pin: 1 });
ClinicSchema.index({ vatNumber: 1 });
ClinicSchema.index({ crNumber: 1 });
// Compound indexes for clinic lookup within complex
ClinicSchema.index({ complexId: 1, name: 1 });
ClinicSchema.index({ complexDepartmentId: 1, name: 1 });
