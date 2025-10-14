import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompleteOnboardingDto } from './complete-onboarding.dto';

// --- DTO for validating onboarding step ---
export class ValidateOnboardingDto extends CompleteOnboardingDto {
  @ApiProperty({
    description: "Optional field to specify which onboarding step is being validated",
    example: "user",
    required: false
  })
  @IsString()
  @IsOptional()
  validationStep?: string; // 'user', 'subscription', 'organization', 'complex', 'clinic', 'complete'
}

// --- DTO for tracking onboarding progress ---
export class OnboardingProgressDto {
  @ApiProperty({ description: 'ID of the user', example: '64fcd123ab12cd34ef567890' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Current onboarding step', example: 'organization-overview' })
  @IsString()
  @IsNotEmpty()
  currentStep: string;

  @ApiProperty({ description: 'Plan type of the onboarding', example: 'company' })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiProperty({ description: 'Array of completed steps', example: ['user', 'subscription'], required: false })
  @IsOptional()
  completedSteps?: string[];

  @ApiProperty({ description: 'Additional step-specific data', example: { organizationName: "HealthCare Group" }, required: false })
  @IsOptional()
  data?: any;
}
