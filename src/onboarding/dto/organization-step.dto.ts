import { IsString, IsOptional, IsNumber, IsUrl, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { 
  ContactInfoDto, 
  BusinessProfileDto, 
  LegalInfoDto 
} from './shared-base.dto';

// Organization overview form - basic entity information
import { ApiProperty } from '@nestjs/swagger';

export class OrganizationOverviewDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'HealthCare Group',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Legal registered name of the organization',
    example: 'HealthCare Group LLC',
    required: false,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({
    description: 'Logo URL of the organization',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;


  @ApiProperty({
    description: 'Year the organization was established',
    example: 1998,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;


  @ApiProperty({
    description: 'Organization vision statement',
    example: 'To be the leading healthcare provider in the region',
    required: false,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiProperty({
    description: 'Overview or description of the organization',
    example: 'HealthCare Group operates multiple hospitals and clinics nationwide.',
    required: false,
  })
  @IsString()
  @IsOptional()
  overview?: string;

  @ApiProperty({
    description: 'Main goals of the organization',
    example: 'Expanding healthcare accessibility, improving patient care.',
    required: false,
  })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiProperty({
    description: 'Name of the CEO or main director',
    example: 'Dr. John Smith',
    required: false,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;
}

// Organization contact form - extends standardized contact structure
export class OrganizationContactDto extends ContactInfoDto {
  // Inherits all contact fields: phoneNumbers, email, address, emergencyContact, socialMediaLinks
}

// Organization legal form - extends standardized legal structure
export class OrganizationLegalDto extends LegalInfoDto {
  // Inherits all legal fields: vatNumber, crNumber, termsConditionsUrl, privacyPolicyUrl
}

// Combined DTO for organization step completion
export class OrganizationStepDto {
  @ValidateNested()
  @Type(() => OrganizationOverviewDto)
  overview: OrganizationOverviewDto;

  @ValidateNested()
  @Type(() => OrganizationContactDto)
  @IsOptional()
  contact?: OrganizationContactDto;

  @ValidateNested()
  @Type(() => OrganizationLegalDto)
  @IsOptional()
  legal?: OrganizationLegalDto;

  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // If true, skip to next step without completing all fields

  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // If true, finalize organization and continue to complex step
} 