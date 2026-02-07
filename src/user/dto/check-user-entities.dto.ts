import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckUserEntitiesDto {
  @ApiProperty({
    description: 'User ID to check entities for',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class UserEntitiesResponseDto {
  @ApiProperty({
    description: 'Whether user has an organization',
    example: true,
    type: Boolean,
  })
  hasOrganization: boolean;

  @ApiProperty({
    description: 'Whether user has a medical complex',
    example: false,
    type: Boolean,
  })
  hasComplex: boolean;

  @ApiProperty({
    description: 'Whether user has a clinic',
    example: false,
    type: Boolean,
  })
  hasClinic: boolean;

  @ApiProperty({
    description: 'Subscription plan type (company, complex, or clinic)',
    example: 'company',
    enum: ['company', 'complex', 'clinic'],
  })
  planType: string;

  @ApiProperty({
    description: 'Whether user has their primary entity based on plan type',
    example: true,
    type: Boolean,
  })
  hasPrimaryEntity: boolean;

  @ApiProperty({
    description: 'Whether user needs to complete setup',
    example: false,
    type: Boolean,
  })
  needsSetup: boolean;

  @ApiProperty({
    description: 'Next step in the setup process or dashboard',
    example: 'dashboard',
    enum: ['dashboard', 'setup-company', 'setup-complex', 'setup-clinic'],
  })
  nextStep: string;
}
