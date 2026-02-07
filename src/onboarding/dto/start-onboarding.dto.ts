import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for starting the onboarding process
 *
 * This DTO is used to initialize the onboarding flow for a new user.
 * The plan type determines which steps will be required.
 */
export class StartOnboardingDto {
  @ApiProperty({
    description: 'Subscription plan type',
    enum: ['company', 'complex', 'clinic'],
    example: 'company',
    required: true,
  })
  @IsEnum(['company', 'complex', 'clinic'], {
    message: 'Plan type must be one of: company, complex, clinic',
  })
  @IsNotEmpty({ message: 'Plan type is required' })
  planType: 'company' | 'complex' | 'clinic';
}
