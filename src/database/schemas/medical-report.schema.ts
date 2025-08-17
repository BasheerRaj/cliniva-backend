import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'medical_reports'
})
export class MedicalReport extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  diagnosis?: string;

  @Prop()
  symptoms?: string;

  @Prop()
  treatmentPlan?: string;

  @Prop()
  medications?: string;

  @Prop()
  followUpInstructions?: string;

  @Prop({ default: false })
  nextAppointmentRecommended: boolean;

  @Prop({ default: true })
  isVisibleToPatient: boolean; // Future: Control patient access to reports

  @Prop()
  deletedAt?: Date;

  @Prop({ default: 1 })
  version: number;
}

export const MedicalReportSchema = SchemaFactory.createForClass(MedicalReport);

// Indexes
MedicalReportSchema.index({ appointmentId: 1 });
MedicalReportSchema.index({ patientId: 1 });
MedicalReportSchema.index({ doctorId: 1 });
MedicalReportSchema.index({ createdBy: 1 });
MedicalReportSchema.index({ deletedAt: 1 });
MedicalReportSchema.index({ version: 1 });
