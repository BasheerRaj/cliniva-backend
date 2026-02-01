import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'appointment_offers',
})
export class AppointmentOffer extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Offer', required: true })
  offerId: Types.ObjectId;

  @Prop({ required: true, type: Number })
  discountAmount: number;
}

export const AppointmentOfferSchema =
  SchemaFactory.createForClass(AppointmentOffer);

// Indexes
AppointmentOfferSchema.index({ appointmentId: 1 });
AppointmentOfferSchema.index({ offerId: 1 });
