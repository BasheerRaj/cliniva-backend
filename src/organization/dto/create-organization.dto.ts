import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description:
      'Subscription ID for the organization (must be a company plan)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Organization name (must be unique)',
    example: 'HealthCare Solutions Inc.',
    type: String,
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Legal name of the organization',
    example: 'HealthCare Solutions Incorporated',
    type: String,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Official registration number',
    example: 'REG-2024-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Organization contact phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization contact email (must be unique)',
    example: 'info@healthcaresolutions.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the organization',
    example: '123 Medical District, Riyadh, Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location URL',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL (relative path)',
    example: '/uploads/logos/healthcare-logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Year the organization was established',
    example: 2020,
    type: Number,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Organization mission statement',
    example:
      'To provide exceptional healthcare services with compassion and excellence',
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
    description: 'Name of the CEO or managing director',
    example: 'Dr. Ahmed Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL',
    example: 'https://www.healthcaresolutions.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'VAT (Value Added Tax) registration number',
    example: '300123456700003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'CR (Commercial Registration) number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name (must be unique)',
    example: 'HealthCare Solutions International',
    type: String,
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Legal name of the organization',
    example: 'HealthCare Solutions Incorporated',
    type: String,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Official registration number',
    example: 'REG-2024-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Organization contact phone number',
    example: '+966501234568',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Organization contact email (must be unique)',
    example: 'contact@healthcaresolutions.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the organization',
    example: '456 Medical Plaza, Riyadh, Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location URL',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL (relative path)',
    example: '/uploads/logos/healthcare-logo-updated.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Year the organization was established',
    example: 2020,
    type: Number,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Organization mission statement',
    example:
      'To provide world-class healthcare services with innovation and compassion',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Organization vision statement',
    example: 'To be the premier healthcare provider globally',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Name of the CEO or managing director',
    example: 'Dr. Ahmed Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL',
    example: 'https://www.healthcaresolutions.international',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'VAT (Value Added Tax) registration number',
    example: '300123456700003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'CR (Commercial Registration) number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;
}

export class SetupLegalInfoDto {
  @ApiPropertyOptional({
    description: 'VAT (Value Added Tax) registration number',
    example: '300123456700003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'CR (Commercial Registration) number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;

  @ApiPropertyOptional({
    description: 'URL to terms and conditions document',
    example: 'https://www.healthcaresolutions.com/terms',
    type: String,
  })
  @IsString()
  @IsOptional()
  termsConditions?: string;

  @ApiPropertyOptional({
    description: 'URL to privacy policy document',
    example: 'https://www.healthcaresolutions.com/privacy',
    type: String,
  })
  @IsString()
  @IsOptional()
  privacyPolicy?: string;
}
