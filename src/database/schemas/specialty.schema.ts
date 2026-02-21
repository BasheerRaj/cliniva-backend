import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'specialties',
})
export class Specialty extends Document {
  @Prop({ required: true, unique: true })
  name: string; // 'Cardiology', 'Dermatology', etc.

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Complex' })
  complexId?: Types.ObjectId;

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  @Prop()
  deactivationReason?: string;
}

export const SpecialtySchema = SchemaFactory.createForClass(Specialty);

// Indexes
SpecialtySchema.index({ isActive: 1 });
SpecialtySchema.index({ complexId: 1 });
SpecialtySchema.index({ name: 'text', description: 'text' });
