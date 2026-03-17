import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Payment Schema - M7 Billing & Payments MVP
 * Represents a financial transaction recording money received from a patient.
 * 
 * Requirements: 6.9, 13.11
 */
@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment extends Document {
  // ==================== Identification ====================
  
  @Prop({ required: true, unique: true, index: true })
  paymentId: string; // Auto-generated unique ID

  // ==================== References ====================
  
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  // ==================== Payment Details ====================
  
  @Prop({ required: true, type: Number, min: 0.01 })
  amount: number;

  @Prop({
    required: true,
    enum: ['cash', 'card', 'bank_transfer', 'insurance', 'check', 'digital_wallet'],
    index: true,
  })
  paymentMethod: string;

  @Prop({ required: true, index: true })
  paymentDate: Date;

  @Prop({ required: false, maxlength: 500 })
  notes?: string;

  @Prop({
    type: [
      {
        invoiceId: { type: Types.ObjectId, ref: 'Invoice', required: true },
        invoiceItemId: { type: Types.ObjectId, required: true },
        serviceName: { type: String, required: false },
        sessionName: { type: String, required: false },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    default: [],
    required: false,
  })
  sessionAllocations?: Array<{
    invoiceId: Types.ObjectId;
    invoiceItemId: Types.ObjectId;
    serviceName?: string;
    sessionName?: string;
    amount: number;
  }>;

  // ==================== Audit Fields ====================
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  // ==================== Timestamps (managed by Mongoose) ====================
  
  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// ==================== Indexes for Performance ====================

// Primary unique index (paymentId index is already created by unique: true in @Prop)
// Requirement: 13.11

// Invoice-based queries with date sorting
PaymentSchema.index({ invoiceId: 1, paymentDate: -1 });

// Patient and clinic-based queries
PaymentSchema.index({ patientId: 1, clinicId: 1 });

// Payment method filtering
PaymentSchema.index({ paymentMethod: 1 });

// Date range queries
PaymentSchema.index({ paymentDate: 1 });

// List queries with default sort
PaymentSchema.index({ createdAt: -1 });
