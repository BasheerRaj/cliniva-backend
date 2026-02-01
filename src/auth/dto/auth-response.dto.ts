import { User } from '../../database/schemas/user.schema';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    // Authentication fields
    isFirstLogin?: boolean;
    passwordChangeRequired?: boolean;
    preferredLanguage?: 'ar' | 'en';
    // Onboarding-related fields
    setupComplete?: boolean;
    subscriptionId?: string | null;
    organizationId?: string | null;
    complexId?: string | null;
    clinicId?: string | null;
    onboardingComplete?: boolean;
    onboardingProgress?: string[];
    planType?: string | null;
    isOwner: boolean;
  };
}

export class UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  nationality?: string;
  dateOfBirth?: Date;
  gender?: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Authentication fields
  isFirstLogin?: boolean;
  lastPasswordChange?: Date;
  passwordChangeRequired?: boolean;
  preferredLanguage?: 'ar' | 'en';

  // Onboarding-related fields
  setupComplete?: boolean;
  subscriptionId?: string | null;
  organizationId?: string | null;
  complexId?: string | null;
  clinicId?: string | null;
  onboardingComplete?: boolean;
  onboardingProgress?: string[];
  isOwner: boolean;

  constructor(user: User) {
    this.id = (user._id as any).toString();
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.phone = user.phone;
    this.role = user.role;
    this.nationality = user.nationality;
    this.dateOfBirth = user.dateOfBirth;
    this.gender = user.gender;
    this.isActive = user.isActive;
    this.emailVerified = user.emailVerified;
    this.twoFactorEnabled = user.twoFactorEnabled;
    this.lastLogin = user.lastLogin;
    this.createdAt = (user as any).createdAt;
    this.updatedAt = (user as any).updatedAt;

    // Include authentication fields
    this.isFirstLogin = user.isFirstLogin;
    this.lastPasswordChange = user.lastPasswordChange;
    this.passwordChangeRequired = user.passwordChangeRequired;
    this.preferredLanguage = user.preferredLanguage;

    // Include onboarding fields
    this.setupComplete = user.setupComplete;
    this.subscriptionId = user.subscriptionId
      ? (user.subscriptionId as any).toString()
      : null;
    this.organizationId = user.organizationId
      ? (user.organizationId as any).toString()
      : null;
    this.complexId = user.complexId ? (user.complexId as any).toString() : null;
    this.clinicId = user.clinicId ? (user.clinicId as any).toString() : null;
    this.onboardingComplete = user.onboardingComplete;
    this.onboardingProgress = user.onboardingProgress;
    this.isOwner = user.role === 'owner';
  }
}
