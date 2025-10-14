import { 
  IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsEnum, ValidateNested, IsEmail, IsUrl 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// --- Step types for the onboarding flow ---
export type OnboardingStepType = 
  | 'organization-overview'
  | 'organization-contact' 
  | 'organization-legal'
  | 'complex-overview'
  | 'complex-contact'
  | 'complex-schedule'
  | 'clinic-overview'
  | 'clinic-contact'
  | 'clinic-schedule'
  | 'completed';

export type PlanType = 'company' | 'complex' | 'clinic';

// --- Onboarding progress DTO ---
export class OnboardingStepProgressDto {
  @ApiProperty({ description: 'ID of the user', example: '64fcd123ab12cd34ef567890' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Current onboarding step', enum: [
    'organization-overview','organization-contact','organization-legal',
    'complex-overview','complex-contact','complex-schedule',
    'clinic-overview','clinic-contact','clinic-schedule','completed'
  ] })
  @IsString()
  @IsEnum([
    'organization-overview','organization-contact','organization-legal',
    'complex-overview','complex-contact','complex-schedule',
    'clinic-overview','clinic-contact','clinic-schedule','completed'
  ])
  currentStep: OnboardingStepType;

  @ApiProperty({ description: 'Plan type for the onboarding', enum: ['company','complex','clinic'] })
  @IsString()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: PlanType;

  @ApiProperty({ description: 'Steps that have been completed', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  completedSteps?: string[];

  @ApiProperty({ description: 'Steps that were skipped', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skippedSteps?: string[];

  @ApiProperty({ description: 'Indicates if the current step can be skipped', required: false })
  @IsBoolean()
  @IsOptional()
  canSkipCurrent?: boolean;

  @ApiProperty({ description: 'Total steps for the current plan type', required: false })
  @IsNumber()
  @IsOptional()
  totalSteps?: number;

  @ApiProperty({ description: 'Current step number (1-based)', required: false })
  @IsNumber()
  @IsOptional()
  currentStepNumber?: number;

  @ApiProperty({ description: 'Temporary data stored between steps', required: false })
  @IsOptional()
  temporaryData?: any;

  @ApiProperty({ description: 'ID of the created organization, if any', required: false })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'ID of the created complex, if any', required: false })
  @IsString()
  @IsOptional()
  complexId?: string;

  @ApiProperty({ description: 'ID of the created clinic, if any', required: false })
  @IsString()
  @IsOptional()
  clinicId?: string;
}

// --- Step validation result DTO ---
export class StepValidationResultDto {
  @ApiProperty({ description: 'Indicates if the step data is valid' })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ description: 'Validation errors', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  errors?: string[];

  @ApiProperty({ description: 'Non-blocking warnings', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warnings?: string[];

  @ApiProperty({ description: 'Next step to navigate to', required: false })
  @IsString()
  @IsOptional()
  nextStep?: string;

  @ApiProperty({ description: 'Indicates if the user can proceed', required: false })
  @IsBoolean()
  @IsOptional()
  canProceed?: boolean;

  @ApiProperty({ description: 'Additional validation details', required: false })
  @IsOptional()
  validationDetails?: any;
}

// --- Step save response DTO ---
export class StepSaveResponseDto {
  @ApiProperty({ description: 'Indicates if the save operation was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Optional message', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Optional saved data or created entity', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'Next step to navigate to', required: false })
  @IsString()
  @IsOptional()
  nextStep?: string;

  @ApiProperty({ description: 'Whether the user can proceed', required: false })
  @IsBoolean()
  @IsOptional()
  canProceed?: boolean;

  @ApiProperty({ description: 'ID of created or updated entity', required: false })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ValidateNested()
  @Type(() => StepValidationResultDto)
  @IsOptional()
  @ApiProperty({ description: 'Validation results', required: false, type: StepValidationResultDto })
  validation?: StepValidationResultDto;
}

// --- Real-time validation DTO ---
export class RealTimeValidationDto {
  @ApiProperty({ description: 'Field name being validated', example: 'email' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Value to validate', example: 'user@example.com' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Entity context', required: false, enum: ['organization','complex','clinic'] })
  @IsString()
  @IsOptional()
  entityType?: 'organization' | 'complex' | 'clinic';

  @ApiProperty({ description: 'Parent entity ID for scoped validation', required: false })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiProperty({ description: 'User ID context', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}

// --- Real-time validation response DTO ---
export class RealTimeValidationResponseDto {
  @ApiProperty({ description: 'Indicates if the value is valid' })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ description: 'Indicates availability for uniqueness checks', required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiProperty({ description: 'Validation message', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Primary suggestion if not available', required: false })
  @IsString()
  @IsOptional()
  suggestion?: string;

  @ApiProperty({ description: 'Multiple suggestions', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  suggestions?: string[];

  @ApiProperty({ description: 'Indicates ongoing async check', required: false })
  @IsBoolean()
  @IsOptional()
  isChecking?: boolean;
}

// --- Working hours validation DTO ---
export class WorkingHoursValidationDto {
  @ApiProperty({ description: 'Day of the week', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] })
  @IsString()
  @IsEnum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  dayOfWeek: string;

  @ApiProperty({ description: 'Indicates if it is a working day' })
  @IsBoolean()
  isWorkingDay: boolean;

  @ApiProperty({ description: 'Opening time (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiProperty({ description: 'Closing time (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiProperty({ description: 'Parent entity type for validation', enum: ['organization','complex'], required: false })
  @IsString()
  @IsOptional()
  parentEntityType?: 'organization' | 'complex';

  @ApiProperty({ description: 'Parent entity ID', required: false })
  @IsString()
  @IsOptional()
  parentEntityId?: string;

  @ApiProperty({ description: 'Parent working day flag', required: false })
  @IsBoolean()
  @IsOptional()
  parentIsWorkingDay?: boolean;

  @ApiProperty({ description: 'Parent opening time', required: false })
  @IsString()
  @IsOptional()
  parentOpeningTime?: string;

  @ApiProperty({ description: 'Parent closing time', required: false })
  @IsString()
  @IsOptional()
  parentClosingTime?: string;
}

// --- Inheritance settings DTO ---
export class InheritanceSettingsDto {
  @ApiProperty({ description: 'Inherit fields from organization', required: false })
  @IsBoolean()
  @IsOptional()
  inheritsFromOrganization?: boolean;

  @ApiProperty({ description: 'Inherit fields from complex', required: false })
  @IsBoolean()
  @IsOptional()
  inheritsFromComplex?: boolean;

  @ApiProperty({ description: 'Fields to inherit', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fieldsToInherit?: string[];

  @ApiProperty({ description: 'Fields to override', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fieldsToOverride?: string[];
}

// --- Step data DTO ---
export class StepDataDto {
  @ApiProperty({ description: 'Step type', enum: [
    'organization-overview','organization-contact','organization-legal',
    'complex-overview','complex-contact','complex-schedule',
    'clinic-overview','clinic-contact','clinic-schedule','completed'
  ] })
  @IsString()
  stepType: OnboardingStepType;

  @ApiProperty({ description: 'Step-specific data', required: false })
  @IsOptional()
  data: any;

  @ValidateNested()
  @Type(() => InheritanceSettingsDto)
  @IsOptional()
  @ApiProperty({ description: 'Inheritance settings for step', required: false, type: InheritanceSettingsDto })
  inheritanceSettings?: InheritanceSettingsDto;

  @ApiProperty({ description: 'Timestamp of step save', required: false })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({ description: 'Whether step is completed', required: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @ApiProperty({ description: 'Whether step was skipped', required: false })
  @IsBoolean()
  @IsOptional()
  isSkipped?: boolean;
}
