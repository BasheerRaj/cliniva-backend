import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'specialties'
})
export class Specialty extends Document {
  @Prop({ required: true, unique: true })
  name: string; // 'Cardiology', 'Dermatology', etc.

  @Prop()
  description?: string;
}

export const SpecialtySchema = SchemaFactory.createForClass(Specialty);

// Indexes are automatically created for unique fields
