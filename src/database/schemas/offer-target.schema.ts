import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'offer_targets'
})
export class OfferTarget extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Offer', required: true })
  offerId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['service', 'clinic_service', 'clinic', 'complex_department'] 
  })
  scopeType: string;

  @Prop({ type: Types.ObjectId, required: true })
  scopeId: Types.ObjectId;
}

export const OfferTargetSchema = SchemaFactory.createForClass(OfferTarget);

// Indexes
OfferTargetSchema.index({ offerId: 1 });
OfferTargetSchema.index({ scopeType: 1, scopeId: 1 });
