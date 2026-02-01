import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'subscription_plans',
})
export class SubscriptionPlan extends Document {
  @Prop({ required: true, enum: ['company', 'complex', 'clinic'] })
  name: string;

  @Prop({ default: 1 })
  maxOrganizations: number;

  @Prop()
  maxComplexes?: number;

  @Prop()
  maxClinics?: number;

  @Prop({ required: true, type: Number })
  price: number;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);

// Indexes
SubscriptionPlanSchema.index({ name: 1 });
