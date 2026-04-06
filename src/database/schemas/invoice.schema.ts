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

  @Prop({ required: true, index: true })
  invoiceNumber: string; // DFT-xxxx or INV-xxxx — unique per org (see compound index below)

  @Prop({ required: false })
  draftNumber?: string; // Preserved DFT-xxxx after posting

  @Prop({ required: true, maxlength: 200 })
  invoiceTitle: string;

  // ==================== References ====================

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true })
  organizationId?: Types.ObjectId; // Optional: absent for clinic-plan tenants

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: false, index: true })
  clinicId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true, index: true })
  subscriptionId: Types.ObjectId; // Mandatory top-level tenant isolation (M1 Fix)

  // ==================== Services (embedded line items) ====================

  @Prop({
    type: [
      {
        serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
        serviceName: { type: String, required: true },
        serviceCategory: { type: String, required: false },
        paymentPlan: {
          type: String,
          enum: ['single_payment', 'allocate_by_session'],
          default: 'allocate_by_session',
        },
        // Total number of sessions for this service (from service definition)
        totalSessions: { type: Number, default: 1, min: 1 },
        // Price per session = totalServicePrice / totalSessions
        pricePerSession: { type: Number, default: 0, min: 0 },
        // Discount and tax applied per session
        discountPercent: { type: Number, default: 0, min: 0, max: 100 },
        taxRate: { type: Number, default: 0, min: 0, max: 100 },
        // Total committed price for all sessions of this service
        totalServicePrice: { type: Number, default: 0, min: 0 },
        sessions: [
          {
            invoiceItemId: {
              type: Types.ObjectId,
              default: () => new Types.ObjectId(),
            },
            sessionId: { type: String, required: false },
            sessionName: { type: String, required: true },
            sessionOrder: { type: Number, required: true },
            doctorId: { type: Types.ObjectId, ref: 'User', required: false },
            unitPrice: { type: Number, required: true, min: 0 },
            discountPercent: { type: Number, default: 0, min: 0, max: 100 },
            discountAmount: { type: Number, default: 0, min: 0 },
            taxRate: { type: Number, default: 0, min: 0, max: 100 },
            taxAmount: { type: Number, default: 0, min: 0 },
            lineTotal: { type: Number, required: true, min: 0 },
            paidAmount: { type: Number, default: 0, min: 0 },
            sessionStatus: {
              type: String,
              enum: ['pending', 'booked', 'in_progress', 'completed', 'cancelled'],
              default: 'pending',
            },
            appointmentId: {
              type: Types.ObjectId,
              ref: 'Appointment',
              required: false,
            },
          },
        ],
      },
    ],
    default: [],
  })
  services: Array<{
    serviceId: Types.ObjectId;
    serviceName: string;
    serviceCategory?: string;
    paymentPlan: string;
    totalSessions: number;
    pricePerSession: number;
    discountPercent: number;
    taxRate: number;
    totalServicePrice: number;
    sessions: Array<{
      invoiceItemId: Types.ObjectId;
      sessionId?: string;
      sessionName: string;
      sessionOrder: number;
      doctorId?: Types.ObjectId;
      unitPrice: number;
      discountPercent: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
      paidAmount: number;
      sessionStatus: string;
      appointmentId?: Types.ObjectId;
    }>;
  }>;

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

  @Prop({ required: false, maxlength: 500 })
  extraInfo?: string; // UC-3h4i5j6k: free-form extra info shown on invoice printout

  @Prop({ required: false, maxlength: 1000 })
  notes?: string;

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

// Unique invoice number per clinic when clinic is present
InvoiceSchema.index(
  { clinicId: 1, invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { clinicId: { $exists: true, $ne: null } },
  },
);
// Unique invoice number per subscription for invoices without clinic
InvoiceSchema.index(
  { subscriptionId: 1, invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { clinicId: { $exists: false } },
  },
);
InvoiceSchema.index({ organizationId: 1, invoiceStatus: 1 });
InvoiceSchema.index({ 'services.sessions.appointmentId': 1 });
InvoiceSchema.index({ 'services.sessions.invoiceItemId': 1 });
