import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'departments',
})
export class Department extends Document {
  @Prop({ required: true, unique: true })
  name: string; // 'Cardiology', 'Pediatrics', etc.

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

// Indexes are automatically created for unique fields
