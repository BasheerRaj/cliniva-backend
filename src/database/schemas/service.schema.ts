import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'services',
})
export class Service extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Complex', required: false })
  complexId?: Types.ObjectId; // Optional for clinic-only services

  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: false })
  clinicId?: Types.ObjectId; // For direct clinic services

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: 30 })
  durationMinutes: number;

  @Prop({ type: Number })
  price?: number;

  @Prop({ type: String, trim: true })
  serviceCategory?: string;

  @Prop({ type: String, trim: true })
  requiredEquipment?: string;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({
    type: String,
    enum: ['single_payment', 'allocate_by_session'],
    default: 'single_payment',
  })
  paymentPlan?: string;

  @Prop({
    type: [
      {
        doctorId: { type: Types.ObjectId, ref: 'User', required: true },
        price: { type: Number, required: true, min: 0 },
        status: {
          type: String,
          enum: ['active', 'inactive'],
          default: 'active',
        },
      },
    ],
    default: [],
    required: false,
  })
  doctorAssignments?: Array<{
    doctorId: Types.ObjectId;
    price: number;
    status: 'active' | 'inactive';
  }>;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Clinic' }],
    default: [],
    required: false,
  })
  clinicIds?: Types.ObjectId[];

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;

  @Prop()
  deactivationReason?: string;

  @Prop({
    type: [
      {
        _id: { type: String, default: () => new Types.ObjectId().toString() },
        name: { type: String, required: true },
        duration: { type: Number, required: false },
        order: { type: Number, required: true },
        description: { type: String, required: false },
        appointmentRequired: { type: Boolean, default: true },
        apptRequired: { type: Boolean, default: true },
        nextSessionId: { type: String, required: false },
      },
    ],
    default: [],
    required: false,
  })
  sessions?: Array<{
    _id: string;
    name: string;
    duration?: number;
    order: number;
    description?: string;
    appointmentRequired: boolean;
    apptRequired: boolean;
    nextSessionId?: string;
  }>;

  @Prop({ default: 0 })
  activeAppointmentsCount?: number;

  @Prop({ default: 0 })
  totalAppointmentsCount?: number;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Indexes
ServiceSchema.index({ complexId: 1 });
ServiceSchema.index({ clinicId: 1 });
ServiceSchema.index({ name: 1 });
ServiceSchema.index({ serviceCategory: 1 });
ServiceSchema.index({ isActive: 1 });
ServiceSchema.index({ deletedAt: 1 });
// Enforce uniqueness only when the scope field is explicitly set (not null/absent)
// Using partialFilterExpression instead of sparse: sparse treats null as a value
// causing false uniqueness conflicts for global (unscoped) services
ServiceSchema.index(
  { complexId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: {
      complexId: { $exists: true, $ne: null },
    },
  },
);
ServiceSchema.index(
  { clinicId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { clinicId: { $exists: true, $ne: null } },
  },
);

// Index for session lookups by session ID within service
ServiceSchema.index({ 'sessions._id': 1 });

ServiceSchema.index({ 'doctorAssignments.doctorId': 1 });
ServiceSchema.index({ clinicIds: 1 });
