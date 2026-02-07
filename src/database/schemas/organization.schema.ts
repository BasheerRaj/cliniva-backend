import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Phone number subdocument
export class PhoneNumber {
  @Prop({ required: true })
  number: string;

  @Prop({
    required: true,
    enum: ['primary', 'secondary', 'emergency', 'fax', 'mobile'],
    default: 'primary',
  })
  type: 'primary' | 'secondary' | 'emergency' | 'fax' | 'mobile';

  @Prop()
  label?: string;
}

// Address subdocument
export class Address {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;

  @Prop()
  googleLocation?: string;
}

// Emergency contact subdocument
export class OrganizationEmergencyContact {
  @Prop()
  name?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  relationship?: string;
}

// Social media links subdocument
export class SocialMediaLinks {
  @Prop()
  facebook?: string;

  @Prop()
  instagram?: string;

  @Prop()
  twitter?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  whatsapp?: string;

  @Prop()
  youtube?: string;

  @Prop()
  website?: string; // Secondary website
}

@Schema({
  timestamps: true,
  collection: 'organizations',
})
export class Organization extends Document {
  // Core identification
  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  // Basic information
  @Prop({ required: true })
  name: string;

  @Prop()
  legalName?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  website?: string;

  // Business information
  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  overview?: string; // Company overview/description

  @Prop()
  goals?: string; // Company goals

  @Prop()
  ceoName?: string;

  // Contact information - STANDARDIZED
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

  // Address - STRUCTURED
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

  // Emergency contact - STRUCTURED
  @Prop({
    type: {
      name: String,
      phone: String,
      email: String,
      relationship: String,
    },
  })
  emergencyContact?: OrganizationEmergencyContact;

  // Social media - STANDARDIZED
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

  // Legal information
  @Prop()
  vatNumber?: string;

  @Prop()
  crNumber?: string; // Commercial registration number

  @Prop()
  termsConditionsUrl?: string;

  @Prop()
  privacyPolicyUrl?: string;

  // Soft delete
  @Prop()
  deletedAt?: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Indexes
OrganizationSchema.index({ subscriptionId: 1 });
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ legalName: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ vatNumber: 1 });
OrganizationSchema.index({ crNumber: 1 });
// Composite index for onboarding plan limit queries (excludes soft-deleted)
OrganizationSchema.index({ subscriptionId: 1, deletedAt: 1 });
