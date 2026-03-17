import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'service-categories',
})
export class ServiceCategory extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const ServiceCategorySchema = SchemaFactory.createForClass(ServiceCategory);

ServiceCategorySchema.index({ name: 1 }, { unique: true });
