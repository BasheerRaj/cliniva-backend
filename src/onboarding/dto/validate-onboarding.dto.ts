import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompleteOnboardingDto } from './complete-onboarding.dto';

export class ValidateOnboardingDto extends CompleteOnboardingDto {
  @ApiPropertyOptional({
    description: 'Validation step to check',
    example: 'clinic',
    type: String,
  })
  @IsString()
  @IsOptional()
  validationStep?: string; // 'user', 'subscription', 'organization', 'complex', 'clinic', 'complete'
}

export class OnboardingProgressDto {
  @ApiPropertyOptional({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Current step name',
    example: 'clinic-overview',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  currentStep: string;

  @ApiPropertyOptional({
    description: 'Plan type',
    example: 'clinic',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiPropertyOptional({
    description: 'Array of completed steps',
    example: ['organization-overview', 'complex-overview'],
    type: [String],
  })
  @IsOptional()
  completedSteps?: string[];

  @ApiPropertyOptional({
    description: 'Onboarding data',
  })
  @IsOptional()
  data?: any;
}
