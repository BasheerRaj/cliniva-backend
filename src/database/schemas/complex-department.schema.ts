import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'complex_departments'
})
export class ComplexDepartment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Complex', required: true })
  complexId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const ComplexDepartmentSchema = SchemaFactory.createForClass(ComplexDepartment);

// Indexes
ComplexDepartmentSchema.index({ complexId: 1 });
ComplexDepartmentSchema.index({ departmentId: 1 });
ComplexDepartmentSchema.index({ complexId: 1, departmentId: 1 }, { unique: true });
ComplexDepartmentSchema.index({ isActive: 1 });
