import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../database/schemas/user.schema';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 86400,
    type: Number,
  })
  expires_in: number;

  @ApiProperty({
    description: 'User information',
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'owner',
      isActive: true,
      emailVerified: true,
      isFirstLogin: false,
      passwordChangeRequired: false,
      preferredLanguage: 'en',
      setupComplete: true,
      subscriptionId: '507f1f77bcf86cd799439012',
      organizationId: '507f1f77bcf86cd799439013',
      complexId: null,
      clinicId: null,
      onboardingComplete: true,
      onboardingProgress: ['company', 'subscription', 'complete'],
      planType: 'company',
      isOwner: true,
    },
  })
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
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  phone?: string;

  @ApiProperty({
    description: 'User role',
    example: 'owner',
    type: String,
  })
  role: string;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'US',
    type: String,
  })
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '1990-01-01T00:00:00.000Z',
    type: Date,
  })
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'User gender',
    example: 'male',
    enum: ['male', 'female', 'other'],
  })
  gender?: string;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
    type: Boolean,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: true,
    type: Boolean,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Whether two-factor authentication is enabled',
    example: false,
    type: Boolean,
  })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-02-03T10:30:00.000Z',
    type: Date,
  })
  lastLogin?: Date;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2024-02-03T10:30:00.000Z',
    type: Date,
  })
  updatedAt: Date;

  // Authentication fields
  @ApiPropertyOptional({
    description: 'Whether this is the user first login',
    example: false,
    type: Boolean,
  })
  isFirstLogin?: boolean;

  @ApiPropertyOptional({
    description: 'Last password change timestamp',
    example: '2024-01-15T10:00:00.000Z',
    type: Date,
  })
  lastPasswordChange?: Date;

  @ApiPropertyOptional({
    description: 'Whether password change is required',
    example: false,
    type: Boolean,
  })
  passwordChangeRequired?: boolean;

  @ApiPropertyOptional({
    description: 'User preferred language',
    example: 'en',
    enum: ['ar', 'en'],
  })
  preferredLanguage?: 'ar' | 'en';

  // Onboarding-related fields
  @ApiPropertyOptional({
    description: 'Whether initial setup is complete',
    example: true,
    type: Boolean,
  })
  setupComplete?: boolean;

  @ApiPropertyOptional({
    description: 'Subscription ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
    nullable: true,
  })
  subscriptionId?: string | null;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
    nullable: true,
  })
  organizationId?: string | null;

  @ApiPropertyOptional({
    description: 'Complex ID',
    example: '507f1f77bcf86cd799439014',
    type: String,
    nullable: true,
  })
  complexId?: string | null;

  @ApiPropertyOptional({
    description: 'Clinic ID',
    example: '507f1f77bcf86cd799439015',
    type: String,
    nullable: true,
  })
  clinicId?: string | null;

  @ApiPropertyOptional({
    description: 'Whether onboarding is complete',
    example: true,
    type: Boolean,
  })
  onboardingComplete?: boolean;

  @ApiPropertyOptional({
    description: 'Onboarding progress steps',
    example: ['company', 'subscription', 'complete'],
    type: [String],
  })
  onboardingProgress?: string[];

  @ApiProperty({
    description: 'Whether the user is an owner',
    example: true,
    type: Boolean,
  })
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
