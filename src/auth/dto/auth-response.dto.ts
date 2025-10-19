import { User } from '../../database/schemas/user.schema';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
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
  username: string; // ✅ إضافة username
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
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
    this.username = user.username; // ✅ إضافة username
    this.role = user.role;
    this.isActive = user.isActive;
    this.emailVerified = user.emailVerified;
    this.twoFactorEnabled = user.twoFactorEnabled;
    this.lastLogin = user.lastLogin;
    this.createdAt = (user as any).createdAt;
    this.updatedAt = (user as any).updatedAt;
    
    // Include onboarding fields
    this.setupComplete = user.setupComplete;
    this.subscriptionId = user.subscriptionId ? (user.subscriptionId as any).toString() : null;
    this.organizationId = user.organizationId ? (user.organizationId as any).toString() : null;
    this.complexId = user.complexId ? (user.complexId as any).toString() : null;
    this.clinicId = user.clinicId ? (user.clinicId as any).toString() : null;
    this.onboardingComplete = user.onboardingComplete;
    this.onboardingProgress = user.onboardingProgress;
    this.isOwner = user.role === 'owner';
  }
}