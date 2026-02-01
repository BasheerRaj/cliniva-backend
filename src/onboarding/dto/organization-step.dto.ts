import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContactInfoDto,
  BusinessProfileDto,
  LegalInfoDto,
} from './shared-base.dto';

// Organization overview form - basic entity information
export class OrganizationOverviewDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  // Business information - flattened for easier form handling
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @IsString()
  @IsOptional()
  mission?: string;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  overview?: string; // Company overview/description

  @IsString()
  @IsOptional()
  goals?: string; // Company goals

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
