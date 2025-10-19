import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';
import { tr } from '@faker-js/faker';

@Schema({
  timestamps: true,
  collection: 'users'
})
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;
  @Prop({ required: true, unique: true, index: true })
  username: string;
  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  phone?: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.PATIENT
  })
  role: UserRole;

  @Prop()
  nationality?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  // Onboarding and setup fields
  @Prop({ default: false })
  setupComplete: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Complex' })
  complexId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop([String])
  onboardingProgress?: string[];

  @Prop({ default: false })
  onboardingComplete: boolean;

  @Prop({ default: false })
  isDeleted?: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  deletedBy?: mongoose.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ username: 1 }); // ✨ Index للبحث السريع
UserSchema.index({ email: 1, username: 1 }); // ✨ Compound index

