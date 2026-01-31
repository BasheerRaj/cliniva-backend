import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

@Schema({
  timestamps: true,
  collection: 'users'
})
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
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

  // Authentication fields
  @Prop({ default: true })
  isFirstLogin: boolean;

  @Prop()
  lastPasswordChange?: Date;

  @Prop({ default: false })
  passwordChangeRequired: boolean;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ default: false })
  passwordResetUsed: boolean;

  @Prop({ enum: ['ar', 'en'] })
  preferredLanguage?: 'ar' | 'en';

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
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ phone: 1 });
