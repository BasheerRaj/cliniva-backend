import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'departments',
})
export class Department extends Document {
  @Prop({ required: true })
  name: string; // 'Cardiology', 'Pediatrics', etc.

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', index: true })
  subscriptionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Complex', index: true })
  complexId?: Types.ObjectId;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.index({ name: 1, subscriptionId: 1 }, { unique: true, sparse: true });

// Indexes are automatically created for unique fields
