import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'clinic_services'
})
export class ClinicService extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Number })
  priceOverride?: number; // Optional clinic-specific price

  @Prop({ default: true })
  isActive: boolean;
}

export const ClinicServiceSchema = SchemaFactory.createForClass(ClinicService);

// Indexes
ClinicServiceSchema.index({ clinicId: 1 });
ClinicServiceSchema.index({ serviceId: 1 });
ClinicServiceSchema.index({ clinicId: 1, serviceId: 1 }, { unique: true });
ClinicServiceSchema.index({ isActive: 1 });
