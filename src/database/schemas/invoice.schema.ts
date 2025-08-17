import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'invoices'
})
export class Invoice extends Document {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment' })
  appointmentId?: Types.ObjectId;

  @Prop({ required: true, type: Number })
  subtotal: number;

  @Prop({ default: 0, type: Number })
  discountAmount: number;

  @Prop({ default: 0, type: Number })
  taxAmount: number;

  @Prop({ required: true, type: Number })
  totalAmount: number;

  @Prop({ default: 0, type: Number })
  paidAmount: number;

  @Prop({ 
    enum: ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    default: 'pending' 
  })
  status: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true })
  issueDate: Date;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  deletedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Virtual for outstanding amount
InvoiceSchema.virtual('outstandingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

// Indexes (invoiceNumber index is already created by unique: true in @Prop)
InvoiceSchema.index({ patientId: 1 });
InvoiceSchema.index({ clinicId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ deletedAt: 1 });
