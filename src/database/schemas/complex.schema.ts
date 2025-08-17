import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'complexes'
})
export class Complex extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId; // NULL for complex-only plans

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId: Types.ObjectId; // Direct link for complex plans

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
  logoUrl?: string;

  @Prop()
  website?: string;

  @Prop()
  managerName?: string;

  // General Information (for Complex Plan)
  @Prop()
  yearEstablished?: number;

  @Prop()
  mission?: string;

  @Prop()
  vision?: string;

  @Prop()
  ceoName?: string;

  // Legal Details (for Complex Plan)
  @Prop()
  vatNumber?: string; // VAT registration number

  @Prop()
  crNumber?: string; // Commercial registration number
}

export const ComplexSchema = SchemaFactory.createForClass(Complex);

// Indexes
ComplexSchema.index({ organizationId: 1 });
ComplexSchema.index({ subscriptionId: 1 });
ComplexSchema.index({ name: 1 });
ComplexSchema.index({ email: 1 });
ComplexSchema.index({ vatNumber: 1 });
ComplexSchema.index({ crNumber: 1 });
