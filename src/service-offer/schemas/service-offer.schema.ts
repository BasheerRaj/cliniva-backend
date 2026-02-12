import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'service_offers',
})
export class ServiceOffer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Offer', required: true })
  offerId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  appliedCount: number;

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  // Timestamps are added automatically by Mongoose when timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const ServiceOfferSchema = SchemaFactory.createForClass(ServiceOffer);

// Indexes
ServiceOfferSchema.index({ serviceId: 1, offerId: 1 }, { unique: true });
ServiceOfferSchema.index({ serviceId: 1, isActive: 1 });
ServiceOfferSchema.index({ offerId: 1 });

