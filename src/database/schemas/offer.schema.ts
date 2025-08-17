import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'offers'
})
export class Offer extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ 
    required: true,
    enum: ['percent', 'amount'] 
  })
  discountType: string;

  @Prop({ required: true, type: Number })
  discountValue: number;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  maxUses?: number;

  @Prop()
  perPatientLimit?: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

// Indexes
OfferSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
OfferSchema.index({ name: 1 });
OfferSchema.index({ createdBy: 1 });
