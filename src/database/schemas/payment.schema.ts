import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment extends Document {
  @Prop({ required: true, unique: true })
  paymentNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({
    required: true,
    enum: [
      'cash',
      'card',
      'bank_transfer',
      'insurance',
      'check',
      'digital_wallet',
    ],
  })
  paymentMethod: string;

  @Prop()
  paymentReference?: string; // Transaction ID, check number, etc.

  @Prop({ required: true })
  paymentDate: Date;

  @Prop({
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  processedBy: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes (paymentNumber index is already created by unique: true in @Prop)
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ patientId: 1 });
PaymentSchema.index({ paymentDate: 1 });
PaymentSchema.index({ paymentMethod: 1 });
PaymentSchema.index({ status: 1 });
