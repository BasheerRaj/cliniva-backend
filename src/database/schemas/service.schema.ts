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

  @Prop({ default: true })
  isActive?: boolean;

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  @Prop()
  deactivationReason?: string;

  @Prop({ default: 0 })
  activeAppointmentsCount?: number;

  @Prop({ default: 0 })
  totalAppointmentsCount?: number;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Indexes
ServiceSchema.index({ complexDepartmentId: 1 });
ServiceSchema.index({ clinicId: 1 });
ServiceSchema.index({ name: 1 });
ServiceSchema.index({ isActive: 1 });
ServiceSchema.index({ deletedAt: 1 });
// Allow same service names across different clinics and complex departments
ServiceSchema.index(
  { complexDepartmentId: 1, name: 1 },
  { unique: true, sparse: true },
);
ServiceSchema.index({ clinicId: 1, name: 1 }, { unique: true, sparse: true });
