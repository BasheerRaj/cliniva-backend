import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PhoneNumber,
  Address,
  OrganizationEmergencyContact,
  SocialMediaLinks,
} from './organization.schema';

@Schema({
  timestamps: true,
  collection: 'complexes',
})
export class Complex extends Document {
  // Relationships
  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId; // NULL for complex-only plans

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId; // Direct link for complex plans

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId; // User who owns/manages this complex

  // Basic information
  @Prop({ required: true })
  name: string;

  @Prop()
  managerName?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  website?: string;

  // Business information - STANDARDIZED with Organization
  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  overview?: string; // Complex overview/description

  @Prop()
  goals?: string; // Complex goals

  @Prop()
  ceoName?: string; // or Complex Director name

  // Contact information - SAME AS ORGANIZATION
  @Prop({
    type: [
      {
        number: { type: String, required: true },
        type: {
          type: String,
          enum: ['primary', 'secondary', 'emergency', 'fax', 'mobile'],
          default: 'primary',
        },
        label: String,
      },
    ],
    default: [],
  })
  phoneNumbers?: PhoneNumber[];

  @Prop()
  email?: string;

  // Address - SAME STRUCTURE AS ORGANIZATION
  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      googleLocation: String,
    },
  })
  address?: Address;

  // Emergency contact - SAME AS ORGANIZATION
  @Prop({
    type: {
      name: String,
      phone: String,
      email: String,
      relationship: String,
    },
  })
  emergencyContact?: OrganizationEmergencyContact;

  // Social media - SAME AS ORGANIZATION
  @Prop({
    type: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      whatsapp: String,
      youtube: String,
      website: String,
    },
  })
  socialMediaLinks?: SocialMediaLinks;

  // Legal information - STANDARDIZED
  @Prop()
  vatNumber?: string;

  @Prop()
  crNumber?: string; // Commercial registration number

  @Prop()
  termsConditionsUrl?: string;

  @Prop()
  privacyPolicyUrl?: string;

  // Status management
  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  personInChargeId?: Types.ObjectId;

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  @Prop()
  deactivationReason?: string;

  // Soft delete
  @Prop()
  deletedAt?: Date;
}

export const ComplexSchema = SchemaFactory.createForClass(Complex);

// Indexes
ComplexSchema.index({ organizationId: 1 });
ComplexSchema.index({ subscriptionId: 1 });
ComplexSchema.index({ ownerId: 1 });
ComplexSchema.index({ name: 1 });
ComplexSchema.index({ email: 1 });
ComplexSchema.index({ vatNumber: 1 });
ComplexSchema.index({ crNumber: 1 });
// Compound index for complex lookup within organization
ComplexSchema.index({ organizationId: 1, name: 1 });
// Status management indexes
ComplexSchema.index({ status: 1 });
ComplexSchema.index({ personInChargeId: 1 });
ComplexSchema.index({ organizationId: 1, status: 1 });
