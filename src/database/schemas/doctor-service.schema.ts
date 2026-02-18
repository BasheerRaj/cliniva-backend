import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'doctor_services',
})
export class DoctorService extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  clinicId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deactivatedAt?: Date;

  @Prop()
  deactivationReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  @Prop({ default: 0 })
  activeAppointmentsCount: number;

  @Prop({ default: 0 })
  totalAppointmentsCount: number;

  @Prop()
  notes?: string;
}

export const DoctorServiceSchema = SchemaFactory.createForClass(DoctorService);

// Indexes
DoctorServiceSchema.index(
  { doctorId: 1, serviceId: 1, clinicId: 1 },
  { unique: true },
);
DoctorServiceSchema.index({ serviceId: 1, isActive: 1 });
DoctorServiceSchema.index({ doctorId: 1, isActive: 1 });
DoctorServiceSchema.index({ clinicId: 1 });
