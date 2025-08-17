import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'employee_shifts'
})
export class EmployeeShift extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['organization', 'complex', 'clinic'] 
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ required: true })
  shiftName: string; // 'Morning Shift', 'Night Shift', 'Emergency', etc.

  @Prop({ 
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] 
  })
  dayOfWeek: string;

  @Prop({ required: true })
  startTime: string; // HH:mm format

  @Prop({ required: true })
  endTime: string; // HH:mm format

  @Prop({ default: 0 })
  breakDurationMinutes: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const EmployeeShiftSchema = SchemaFactory.createForClass(EmployeeShift);

// Indexes
EmployeeShiftSchema.index({ userId: 1 });
EmployeeShiftSchema.index({ entityType: 1, entityId: 1 });
