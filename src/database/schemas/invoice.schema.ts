import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Invoice Schema - M7 Billing & Payments MVP
 * Represents a billing document for patient services with line items, totals, and payment tracking.
 * 
 * Requirements: 1.4, 1.5, 1.10, 1.11, 13.10, 13.11, 14.1, 14.2
 */
@Schema({
  timestamps: true,
  collection: 'invoices',
})
export class Invoice extends Document {
  // ==================== Identification ====================
  
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string; // DFT-xxxx or INV-xxxx

  @Prop({ required: false })
  draftNumber?: string; // Preserved DFT-xxxx after posting

  @Prop({ required: true, maxlength: 200 })
  invoiceTitle: string;

  // ==================== References ====================
  
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false, index: true })
  appointmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  // ==================== Financial Fields ====================
  
  @Prop({ required: true, type: Number, min: 0 })
  subtotal: number;

  @Prop({ default: 0, type: Number, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, type: Number, min: 0 })
  taxAmount: number;

  @Prop({ required: true, type: Number, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, type: Number, min: 0 })
  paidAmount: number;

  // ==================== Status Fields ====================
  
  @Prop({
    required: true,
    enum: ['draft', 'posted', 'cancelled'],
    default: 'draft',
    index: true,
  })
  invoiceStatus: string;

  @Prop({
    required: true,
    enum: ['not_due', 'unpaid', 'partially_paid', 'paid'],
    default: 'not_due',
    index: true,
  })
  paymentStatus: string;

  // ==================== Dates ====================
  
  @Prop({ required: true, index: true })
  issueDate: Date;

  @Prop({ required: false })
  lastPaymentDate?: Date;

  @Prop({ required: false })
  postedAt?: Date; // Timestamp when status changed to Posted

  // ==================== Additional Fields ====================
  
  @Prop({ required: false, maxlength: 1000 })
  notes?: string;

  @Prop({ default: 1, min: 1 })
  sessions: number; // Number of sessions for the service

  // ==================== Audit Fields ====================
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  // ==================== Soft Delete ====================
  
  @Prop({ required: false })
  deletedAt?: Date;

  // ==================== Timestamps (managed by Mongoose) ====================
  
  createdAt: Date;
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// ==================== Virtual Fields ====================

// Virtual field for outstanding balance calculation
// Requirement: 1.10, 1.11
InvoiceSchema.virtual('outstandingBalance').get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

// Enable virtuals in JSON output
InvoiceSchema.set('toJSON', { virtuals: true });
InvoiceSchema.set('toObject', { virtuals: true });

// ==================== Indexes for Performance ====================

// Primary unique index (invoiceNumber index is already created by unique: true in @Prop)
// Requirement: 13.10, 14.1

// Patient-based queries
InvoiceSchema.index({ patientId: 1, clinicId: 1 });

// Status-based filtering
InvoiceSchema.index({ invoiceStatus: 1, paymentStatus: 1 });

// Date range queries
InvoiceSchema.index({ issueDate: 1 });

// List queries with default sort
InvoiceSchema.index({ createdAt: -1 });

// Soft delete filtering
InvoiceSchema.index({ deletedAt: 1 });
