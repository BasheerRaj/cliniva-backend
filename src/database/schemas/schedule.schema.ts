import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'schedules'
})
export class Schedule extends Document {
  @Prop({ 
    required: true,
    enum: ['doctor_availability', 'room_booking', 'equipment_schedule', 'facility_hours', 'maintenance', 'recurring_template', 'block_time', 'holiday']
  })
  scheduleType: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  // Entity references - flexible to different types
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // Doctor/Employee

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Complex' })
  complexId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop()
  roomId?: string; // Room identifier

  @Prop()
  equipmentId?: string; // Equipment identifier

  // Date and time information
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  startTime: string; // HH:mm format

  @Prop({ required: true })
  endTime: string; // HH:mm format

  @Prop()
  timezone?: string; // For multi-timezone support

  // Recurrence information
  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({ 
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    default: null
  })
  recurrenceType?: string;

  @Prop()
  recurrenceInterval?: number; // Every N days/weeks/months

  @Prop([String])
  recurrenceDays?: string[]; // ['monday', 'tuesday', ...]

  @Prop()
  recurrenceEndDate?: Date;

  @Prop()
  maxOccurrences?: number;

  // Availability and booking information
  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isBlocked: boolean; // Blocked time (unavailable)

  @Prop()
  maxCapacity?: number; // For rooms/equipment

  @Prop({ default: 0 })
  currentBookings: number;

  @Prop({ default: 0 })
  slotDuration: number; // Minutes per time slot (e.g., 30 min appointments)

  @Prop()
  breakDuration?: number; // Break time in minutes

  // Priority and status
  @Prop({ 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  })
  priority: string;

  @Prop({ 
    enum: ['draft', 'active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  })
  status: string;

  // Approval workflow
  @Prop({ default: false })
  requiresApproval: boolean;

  @Prop({ 
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'auto_approved'
  })
  approvalStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectionReason?: string;

  // Notifications and reminders
  @Prop({ default: false })
  sendReminders: boolean;

  @Prop([Number])
  reminderMinutes?: number[]; // [60, 30, 15] - minutes before event

  @Prop()
  lastReminderSent?: Date;

  // Metadata
  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>; // Flexible key-value storage

  @Prop()
  tags?: string[]; // For categorization and filtering

  @Prop()
  color?: string; // For calendar display (#hexcode)

  // Audit trail
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  // Conflict resolution
  @Prop({ default: false })
  allowOverlap: boolean; // Allow overlapping schedules

  @Prop()
  conflictResolution?: string; // Strategy for handling conflicts

  // External integration
  @Prop()
  externalId?: string; // For third-party calendar integration

  @Prop()
  syncStatus?: string; // 'synced', 'pending', 'error'
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

// Comprehensive indexes for performance
ScheduleSchema.index({ scheduleType: 1 });
ScheduleSchema.index({ userId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ clinicId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ complexId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ organizationId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ roomId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ equipmentId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ status: 1, isActive: 1 });
ScheduleSchema.index({ isRecurring: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1 });
ScheduleSchema.index({ startTime: 1, endTime: 1 });
ScheduleSchema.index({ approvalStatus: 1 });
ScheduleSchema.index({ tags: 1 });
ScheduleSchema.index({ deletedAt: 1 });
ScheduleSchema.index({ 
  scheduleType: 1, 
  userId: 1, 
  startDate: 1, 
  endDate: 1, 
  startTime: 1, 
  endTime: 1 
}); // Composite index for conflict detection 