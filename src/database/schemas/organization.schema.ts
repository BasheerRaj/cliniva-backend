import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'organizations'
})
export class Organization extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  legalName?: string; // Legal company name

  @Prop()
  registrationNumber?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  @Prop()
  googleLocation?: string; // Google Maps location/coordinates

  @Prop()
  logoUrl?: string;

  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  ceoName?: string;

  @Prop()
  website?: string;

  // Legal Details
  @Prop()
  vatNumber?: string; // VAT registration number

  @Prop()
  crNumber?: string; // Commercial registration number
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Indexes
OrganizationSchema.index({ subscriptionId: 1 });
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ legalName: 1 });
OrganizationSchema.index({ registrationNumber: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ vatNumber: 1 });
OrganizationSchema.index({ crNumber: 1 });
