import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'user_locations'
})
export class UserLocation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['home', 'work', 'emergency', 'other'] 
  })
  locationType: string;

  @Prop({ required: true })
  addressLine1: string;

  @Prop()
  addressLine2?: string;

  @Prop({ required: true })
  city: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop({ required: true })
  country: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

export const UserLocationSchema = SchemaFactory.createForClass(UserLocation);

// Indexes
UserLocationSchema.index({ userId: 1 });
