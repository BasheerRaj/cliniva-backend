import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Validate Plan Limits DTO
 *
 * Data Transfer Object for validating plan limits.
 * Used as query parameters for GET /onboarding/validate-plan-limits endpoint.
 *
 * BZR-26: Company plan - 1 company limit
 * BZR-28: Complex plan - 1 complex limit
 * BZR-30: Clinic plan - 1 clinic limit
 */
export class ValidatePlanLimitsDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Entity type to validate (organization, complex, or clinic)',
    enum: ['organization', 'complex', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['organization', 'complex', 'clinic'])
  @IsNotEmpty()
  entityType: 'organization' | 'complex' | 'clinic';
}
