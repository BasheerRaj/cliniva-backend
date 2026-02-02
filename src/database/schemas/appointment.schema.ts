import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'appointments',
})
export class Appointment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ required: true })
  appointmentDate: Date;

  @Prop({ required: true })
  appointmentTime: string; // HH:mm format

  @Prop({ default: 30 })
  durationMinutes: number;

  @Prop({
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
    default: 'scheduled',
  })
  status: string;

  @Prop({
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  urgencyLevel: string;

  @Prop()
  notes?: string;

  @Prop()
  cancellationReason?: string;

  // Appointment transfer tracking fields
  @Prop({ type: Types.ObjectId, ref: 'User' })
  previousDoctorId?: Types.ObjectId;

  @Prop()
  transferredAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  transferredBy?: Types.ObjectId;

  // Rescheduling tracking fields
  @Prop()
  reschedulingReason?: string;

  @Prop()
  markedForReschedulingAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  markedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  deletedAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Indexes
AppointmentSchema.index({ clinicId: 1, appointmentDate: 1 });
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
AppointmentSchema.index({ patientId: 1, appointmentDate: 1 });
AppointmentSchema.index({ serviceId: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ urgencyLevel: 1 });
AppointmentSchema.index({ deletedAt: 1 });
AppointmentSchema.index({ doctorId: 1, status: 1, appointmentDate: 1 }); // Composite index for appointment transfer queries

// Optimized indexes for conflict detection and rescheduling
AppointmentSchema.index({ 
  doctorId: 1, 
  appointmentDate: 1, 
  status: 1, 
  deletedAt: 1 
}); // Composite index for efficient conflict detection queries

AppointmentSchema.index({ 
  doctorId: 1, 
  appointmentDate: 1, 
  appointmentTime: 1 
}); // Index for time-based queries
