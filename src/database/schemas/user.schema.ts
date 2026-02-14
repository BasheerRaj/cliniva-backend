import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

@Schema({
  timestamps: true,
  collection: 'users',
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
    default: UserRole.PATIENT,
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

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  pendingEmail?: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  lastLogin?: Date;

  // Authentication fields
  @Prop({ default: true })
  isFirstLogin: boolean;

  @Prop({ default: false })
  temporaryPassword: boolean;

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

  @Prop()
  profilePictureUrl?: string;

  // User preferences
  @Prop({
    type: {
      language: { type: String, enum: ['ar', 'en'], default: 'en' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        appointmentReminders: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false },
      },
    },
    default: {},
  })
  preferences?: {
    language?: 'ar' | 'en';
    theme?: 'light' | 'dark' | 'auto';
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      appointmentReminders?: boolean;
      systemUpdates?: boolean;
    };
  };

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

  @Prop()
  currentOnboardingStep?: string;

  @Prop({ type: [String], default: [] })
  skippedSteps?: string[];

  @Prop({ enum: ['company', 'complex', 'clinic'] })
  planType?: 'company' | 'complex' | 'clinic';

  @Prop({ default: false })
  onboardingCompleted?: boolean;

  @Prop()
  onboardingCompletedAt?: Date;

  // User creation tracking
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  // Deactivation tracking fields
  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deactivatedBy?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ isActive: 1, role: 1 }); // Composite index for user management queries
UserSchema.index({ clinicId: 1, role: 1, isActive: 1 }); // Composite index for clinic capacity queries
UserSchema.index({ subscriptionId: 1 }); // Index for onboarding queries
UserSchema.index({ currentOnboardingStep: 1 }); // Index for progress tracking
