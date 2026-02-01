import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'working_hours',
})
export class WorkingHours extends Document {
  @Prop({
    required: true,
    enum: ['organization', 'complex', 'clinic', 'user'],
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  })
  dayOfWeek: string;

  @Prop({ default: true })
  isWorkingDay: boolean;

  @Prop()
  openingTime?: string; // HH:mm format

  @Prop()
  closingTime?: string; // HH:mm format

  @Prop()
  breakStartTime?: string; // HH:mm format

  @Prop()
  breakEndTime?: string; // HH:mm format

  @Prop({ default: true })
  isActive: boolean;
}

export const WorkingHoursSchema = SchemaFactory.createForClass(WorkingHours);

// Indexes
WorkingHoursSchema.index({ entityType: 1, entityId: 1 });
WorkingHoursSchema.index(
  { entityType: 1, entityId: 1, dayOfWeek: 1 },
  { unique: true },
);
