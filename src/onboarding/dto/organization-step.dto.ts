import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContactInfoDto,
  BusinessProfileDto,
  LegalInfoDto,
} from './shared-base.dto';

// Organization overview form - basic entity information
export class OrganizationOverviewDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Al-Zahra Healthcare Group',
    type: String,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Legal name of the organization',
    example: 'Al-Zahra Healthcare Group LLC',
    type: String,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://example.com/logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL',
    example: 'https://alzahra-healthcare.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  // Business information - flattened for easier form handling
  @ApiPropertyOptional({
    description: 'Year the organization was established',
    example: 2015,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Organization mission statement',
    example: 'To provide world-class healthcare services',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Organization vision statement',
    example: 'To be the leading healthcare provider in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Company overview or description',
    example: 'A comprehensive healthcare organization serving multiple cities',
    type: String,
  })
  @IsString()
  @IsOptional()
  overview?: string; // Company overview/description

  @ApiPropertyOptional({
    description: 'Company goals and objectives',
    example: 'Expand to 10 cities by 2025',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string; // Company goals

  @ApiPropertyOptional({
    description: 'CEO or managing director name',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
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
  @ApiProperty({
    description: 'Organization overview information',
    type: OrganizationOverviewDto,
  })
  @ValidateNested()
  @Type(() => OrganizationOverviewDto)
  overview: OrganizationOverviewDto;

  @ApiPropertyOptional({
    description: 'Organization contact information',
    type: OrganizationContactDto,
  })
  @ValidateNested()
  @Type(() => OrganizationContactDto)
  @IsOptional()
  contact?: OrganizationContactDto;

  @ApiPropertyOptional({
    description: 'Organization legal information',
    type: OrganizationLegalDto,
  })
  @ValidateNested()
  @Type(() => OrganizationLegalDto)
  @IsOptional()
  legal?: OrganizationLegalDto;

  @ApiPropertyOptional({
    description: 'Skip to next step without completing all fields',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // If true, skip to next step without completing all fields

  @ApiPropertyOptional({
    description: 'Finalize organization and continue to complex step',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // If true, finalize organization and continue to complex step
}
