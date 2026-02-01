import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'services',
})
export class Service extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ComplexDepartment', required: false })
  complexDepartmentId?: Types.ObjectId; // Optional for clinic-only services

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: false })
  clinicId?: Types.ObjectId; // For direct clinic services

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: 30 })
  durationMinutes: number;

  @Prop({ type: Number })
  price?: number;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Indexes
ServiceSchema.index({ complexDepartmentId: 1 });
ServiceSchema.index({ clinicId: 1 });
ServiceSchema.index({ name: 1 });
// Allow same service names across different clinics and complex departments
ServiceSchema.index(
  { complexDepartmentId: 1, name: 1 },
  { unique: true, sparse: true },
);
ServiceSchema.index({ clinicId: 1, name: 1 }, { unique: true, sparse: true });
