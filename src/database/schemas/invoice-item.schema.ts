import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'invoice_items',
})
export class InvoiceItem extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ required: true, maxlength: 500 })
  description: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({ required: true, type: Number })
  unitPrice: number;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

// Virtual for total price
InvoiceItemSchema.virtual('totalPrice').get(function () {
  return this.quantity * this.unitPrice;
});

// Indexes
InvoiceItemSchema.index({ invoiceId: 1 });
InvoiceItemSchema.index({ serviceId: 1 });
