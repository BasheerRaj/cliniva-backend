import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Validate Step DTO
 * 
 * Data Transfer Object for validating step dependencies in onboarding.
 * Ensures users complete prerequisites before accessing dependent steps.
 * 
 * BZR-27: Clinic details require complex details first
 */
export class ValidateStepDto {
  @ApiProperty({
    description: 'User ID requesting step validation',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Subscription ID for the user',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Step name to validate (e.g., "clinic-overview")',
    example: 'clinic-overview',
  })
  @IsString()
  @IsNotEmpty()
  requestedStep: string;
}
