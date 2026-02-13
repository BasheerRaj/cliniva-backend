import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Step types for the onboarding flow
export type OnboardingStepType =
  | 'organization-overview'
  | 'organization-contact'
  | 'organization-legal'
  | 'complex-overview'
  | 'complex-contact'
  | 'complex-legal'
  | 'complex-schedule'
  | 'clinic-overview'
  | 'clinic-contact'
  | 'clinic-legal'
  | 'clinic-schedule'
  | 'completed';

export type PlanType = 'company' | 'complex' | 'clinic';

export class OnboardingStepProgressDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Current onboarding step',
    enum: [
      'organization-overview',
      'organization-contact',
      'organization-legal',
      'complex-overview',
      'complex-contact',
      'complex-legal',
      'complex-schedule',
      'clinic-overview',
      'clinic-contact',
      'clinic-legal',
      'clinic-schedule',
      'completed',
    ],
    example: 'clinic-overview',
  })
  @IsString()
  @IsEnum([
    'organization-overview',
    'organization-contact',
    'organization-legal',
    'complex-overview',
    'complex-contact',
    'complex-legal',
    'complex-schedule',
    'clinic-overview',
    'clinic-contact',
    'clinic-legal',
    'clinic-schedule',
    'completed',
  ])
  currentStep: OnboardingStepType;

  @ApiProperty({
    description: 'Subscription plan type',
    enum: ['company', 'complex', 'clinic'],
    example: 'clinic',
  })
  @IsString()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: PlanType;

  @ApiPropertyOptional({
    description: 'Array of completed step names',
    example: ['organization-overview', 'complex-overview'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  completedSteps?: string[];

  @ApiPropertyOptional({
    description: 'Array of skipped step names',
    example: ['organization-contact'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skippedSteps?: string[];

  @ApiPropertyOptional({
    description: 'Whether current step can be skipped',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  canSkipCurrent?: boolean; // Whether current step can be skipped

  @ApiPropertyOptional({
    description: 'Total steps for the plan type',
    example: 9,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  totalSteps?: number; // Total steps for the plan type

  @ApiPropertyOptional({
    description: 'Current step number (1-based)',
    example: 5,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  currentStepNumber?: number; // Current step number (1-based)

  @ApiPropertyOptional({
    description: 'Temporary data stored between steps',
  })
  @IsOptional()
  temporaryData?: any; // Temporary data stored between steps

  @ApiPropertyOptional({
    description: 'Created organization ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsOptional()
  organizationId?: string; // Created organization ID

  @ApiPropertyOptional({
    description: 'Created complex ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexId?: string; // Created complex ID

  @ApiPropertyOptional({
    description: 'Created clinic ID',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsString()
  @IsOptional()
  clinicId?: string; // Created clinic ID
}

export class StepValidationResultDto {
  @IsBoolean()
  isValid: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  errors?: string[]; // Validation errors

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warnings?: string[]; // Non-blocking warnings

  @IsString()
  @IsOptional()
  nextStep?: string; // Next step to navigate to

  @IsBoolean()
  @IsOptional()
  canProceed?: boolean; // Whether user can proceed to next step

  @IsOptional()
  validationDetails?: any; // Additional validation context
}

export class StepSaveResponseDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  data?: any; // Saved data or created entity

  @IsString()
  @IsOptional()
  nextStep?: string;

  @IsBoolean()
  @IsOptional()
  canProceed?: boolean;

  @IsString()
  @IsOptional()
  entityId?: string; // ID of created/updated entity

  @ValidateNested()
  @Type(() => StepValidationResultDto)
  @IsOptional()
  validation?: StepValidationResultDto;
}

// Real-time validation request DTO
export class RealTimeValidationDto {
  @IsString()
  field: string; // Field being validated

  @IsString()
  value: string; // Value to validate

  @IsString()
  @IsOptional()
  entityType?: 'organization' | 'complex' | 'clinic' | 'user'; // Entity context

  @IsString()
  @IsOptional()
  entityId?: string; // Parent entity ID for scoped validation

  @IsString()
  @IsOptional()
  userId?: string; // User context for ownership validation
}

// Real-time validation response DTO
export class RealTimeValidationResponseDto {
  @IsBoolean()
  isValid: boolean;

  @IsBoolean()
  isAvailable?: boolean; // For uniqueness checks

  @IsString()
  @IsOptional()
  message?: string; // Validation message

  @IsString()
  @IsOptional()
  suggestion?: string; // Primary alternative suggestion if not available

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  suggestions?: string[]; // Multiple alternative suggestions

  @IsBoolean()
  @IsOptional()
  isChecking?: boolean; // Still validating (for async checks)
}

// Working hours hierarchy validation DTO
export class WorkingHoursValidationDto {
  @IsString()
  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  dayOfWeek: string;

  @IsBoolean()
  isWorkingDay: boolean;

  @IsString()
  @IsOptional()
  openingTime?: string;

  @IsString()
  @IsOptional()
  closingTime?: string;

  @IsString()
  @IsOptional()
  parentEntityType?: 'organization' | 'complex'; // Parent entity type

  @IsString()
  @IsOptional()
  parentEntityId?: string; // Parent entity ID

  // Parent working hours for validation
  @IsBoolean()
  @IsOptional()
  parentIsWorkingDay?: boolean;

  @IsString()
  @IsOptional()
  parentOpeningTime?: string;

  @IsString()
  @IsOptional()
  parentClosingTime?: string;
}

// Inheritance settings DTO
export class InheritanceSettingsDto {
  @ApiPropertyOptional({
    description: 'Whether to inherit from organization',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  inheritsFromOrganization?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to inherit from complex',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  inheritsFromComplex?: boolean;

  @ApiPropertyOptional({
    description: 'Specific fields to inherit',
    example: ['workingHours', 'contactInfo'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fieldsToInherit?: string[]; // Specific fields to inherit

  @ApiPropertyOptional({
    description: 'Fields to override despite inheritance',
    example: ['logoUrl', 'website'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fieldsToOverride?: string[]; // Fields to override despite inheritance
}

// Complete step data DTO (for saving between steps)
export class StepDataDto {
  @IsString()
  stepType: OnboardingStepType;

  @IsOptional()
  data: any; // Step-specific data

  @ValidateNested()
  @Type(() => InheritanceSettingsDto)
  @IsOptional()
  inheritanceSettings?: InheritanceSettingsDto;

  @IsString()
  @IsOptional()
  timestamp?: string; // When data was saved

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean; // Whether step is completed

  @IsBoolean()
  @IsOptional()
  isSkipped?: boolean; // Whether step was skipped
}
