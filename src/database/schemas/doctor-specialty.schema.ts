import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'doctor_specialties'
})
export class DoctorSpecialty extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Specialty', required: true })
  specialtyId: Types.ObjectId;

  @Prop({ default: 0 })
  yearsOfExperience: number;

  @Prop()
  certificationNumber?: string;
}

export const DoctorSpecialtySchema = SchemaFactory.createForClass(DoctorSpecialty);

// Indexes
DoctorSpecialtySchema.index({ doctorId: 1 });
DoctorSpecialtySchema.index({ specialtyId: 1 });
DoctorSpecialtySchema.index({ doctorId: 1, specialtyId: 1 }, { unique: true });
