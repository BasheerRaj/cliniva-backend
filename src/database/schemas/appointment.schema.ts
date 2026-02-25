import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Appointment Schema
 * Represents a scheduled medical consultation between a patient and a doctor
 * for a specific service at a specific clinic.
 * 
 * M6 Appointments Management Module
 * Requirements: 1.1-1.12, 16.1-16.7
 */
@Schema({
  timestamps: true,
  collection: 'appointments',
})
export class Appointment extends Document {
  // ==================== Relationships ====================
  
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true, index: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Complex', required: false })
  complexId?: Types.ObjectId;

  // ==================== Appointment Details ====================
  
  @Prop({ required: true, type: Date, index: true })
  appointmentDate: Date;

  @Prop({ required: true })
  appointmentTime: string; // Format: "HH:mm"

  @Prop({ required: true })
  durationMinutes: number; // Duration in minutes (from service)

  @Prop({
    required: true,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
    index: true,
  })
  status: string;

  @Prop({
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  urgency?: string;

  @Prop({ type: String, required: false, index: true })
  sessionId?: string; // References session._id within service.sessions array

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false })
  internalNotes?: string;

  // ==================== Booking Information ====================
  
  @Prop({ required: false, enum: ['web', 'phone', 'walk-in'], default: 'web' })
  bookingChannel?: string;

  @Prop({ required: false })
  reason?: string;

  // ==================== Time Tracking ====================
  
  @Prop({ type: Date, required: false })
  actualStartTime?: Date;

  @Prop({ type: Date, required: false })
  actualEndTime?: Date;

  // ==================== Status-Specific Fields ====================
  
  @Prop({ required: false })
  completionNotes?: string;

  @Prop({ required: false })
  cancellationReason?: string;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  cancelledBy?: Types.ObjectId;

  @Prop({ required: false, default: false })
  rescheduleRequested?: boolean;

  @Prop({ required: false })
  rescheduledReason?: string;

  @Prop({ type: Date, required: false })
  rescheduledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false })
  transferredFrom?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  transferredAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  transferredBy?: Types.ObjectId;

  // ==================== Medical Record Integration ====================
  
  @Prop({ type: Types.ObjectId, ref: 'MedicalReport', required: false })
  medicalReportId?: Types.ObjectId;

  @Prop({ required: false, default: false })
  isDocumented?: boolean;

  // ==================== Rescheduling History ====================
  
  @Prop({
    type: [
      {
        previousDate: Date,
        previousTime: String,
        newDate: Date,
        newTime: String,
        reason: String,
        rescheduledAt: Date,
        rescheduledBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    required: false,
  })
  rescheduleHistory?: Array<{
    previousDate: Date;
    previousTime: string;
    newDate: Date;
    newTime: string;
    reason?: string;
    rescheduledAt: Date;
    rescheduledBy: Types.ObjectId;
  }>;

  // ==================== Status History ====================
  
  @Prop({
    type: [
      {
        status: String,
        changedAt: Date,
        changedBy: { type: Types.ObjectId, ref: 'User' },
        reason: String,
      },
    ],
    required: false,
  })
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }>;

  // ==================== Audit Fields ====================
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  deletedBy?: Types.ObjectId;

  // ==================== Soft Delete ====================
  
  @Prop({ required: false, default: false, index: true })
  isDeleted?: boolean;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  // ==================== Timestamps (managed by Mongoose) ====================
  
  createdAt: Date;
  updatedAt: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// ==================== Compound Indexes for Performance ====================

// Primary conflict detection index - optimized for checking doctor availability
AppointmentSchema.index({ 
  doctorId: 1, 
  appointmentDate: 1, 
  appointmentTime: 1 
});

// Clinic-based queries - for clinic schedule views
AppointmentSchema.index({ 
  clinicId: 1, 
  appointmentDate: 1, 
  appointmentTime: 1 
});

// Patient appointment history
AppointmentSchema.index({ 
  patientId: 1, 
  appointmentDate: 1 
});

// Status-based filtering with date range
AppointmentSchema.index({ 
  status: 1, 
  appointmentDate: 1 
});

// Soft delete filtering - exclude deleted appointments efficiently
AppointmentSchema.index({ 
  isDeleted: 1, 
  status: 1, 
  appointmentDate: 1 
});

// Department-based queries
AppointmentSchema.index({ 
  departmentId: 1, 
  appointmentDate: 1 
});

// Medical record integration - find appointments by medical report
AppointmentSchema.index({ 
  medicalReportId: 1 
});

// Audit trail - find appointments by creator/updater
AppointmentSchema.index({
  createdBy: 1,
  createdAt: 1
});

AppointmentSchema.index({
  updatedBy: 1,
  updatedAt: 1
});

// Compound index for duplicate session booking detection
// Requirements: 4.5, 15.1
AppointmentSchema.index({
  patientId: 1,
  serviceId: 1,
  sessionId: 1,
  status: 1,
});

// Compound index for session availability queries
// Requirement: 15.2
AppointmentSchema.index({
  serviceId: 1,
  sessionId: 1,
  appointmentDate: 1,
});

// Index for session-specific queries
AppointmentSchema.index({
  sessionId: 1,
  status: 1,
});
