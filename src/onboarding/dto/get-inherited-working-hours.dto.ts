import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Get Inherited Working Hours DTO
 *
 * Data Transfer Object for retrieving inherited working hours.
 * Used as query parameters for GET /onboarding/inherited-working-hours endpoint.
 *
 * BZR-29: Working hours inheritance from parent entities
 */
export class GetInheritedWorkingHoursDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Plan type (company, complex, or clinic)',
    enum: ['company', 'complex', 'clinic'],
    example: 'clinic',
  })
  @IsEnum(['company', 'complex', 'clinic'])
  @IsNotEmpty()
  planType: 'company' | 'complex' | 'clinic';

  @ApiProperty({
    description:
      'Complex ID (required for clinic plan to inherit from complex)',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  @IsString()
  @IsOptional()
  complexId?: string;
}
