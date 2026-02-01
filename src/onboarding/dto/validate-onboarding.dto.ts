import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompleteOnboardingDto } from './complete-onboarding.dto';

export class ValidateOnboardingDto extends CompleteOnboardingDto {
  @IsString()
  @IsOptional()
  validationStep?: string; // 'user', 'subscription', 'organization', 'complex', 'clinic', 'complete'
}

export class OnboardingProgressDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  currentStep: string;

  @IsString()
  @IsNotEmpty()
  planType: string;

  @IsOptional()
  completedSteps?: string[];

  @IsOptional()
  data?: any;
}
