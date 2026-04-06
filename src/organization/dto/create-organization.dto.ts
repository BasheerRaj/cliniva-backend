import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Social media links DTO - used for organization social media profiles
 */
export class SocialMediaLinksDto {
  @ApiPropertyOptional({
    description: 'Facebook profile or page URL',
    example: 'https://www.facebook.com/healthcaresolutions',
    type: String,
  })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL',
    example: 'https://www.instagram.com/healthcaresolutions',
    type: String,
  })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Twitter/X profile URL',
    example: 'https://twitter.com/healthcaresolutions',
    type: String,
  })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn company page URL',
    example: 'https://www.linkedin.com/company/healthcaresolutions',
    type: String,
  })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp contact link',
    example: 'https://wa.me/966501234567',
    type: String,
  })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({
    description: 'YouTube channel URL',
    example: 'https://www.youtube.com/@healthcaresolutions',
    type: String,
  })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({
    description: 'Secondary website URL',
    example: 'https://blog.healthcaresolutions.com',
    type: String,
  })
  @IsOptional()
  @IsString()
  website?: string;
}

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
    description: 'Organization contact phone numbers',
    example: ['+966501234567', '+966501234568'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  phoneNumbers?: any[];

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
  @IsString()
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
    description: 'Organization goals',
    example: 'Expand specialty care and improve patient access',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string;

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

  @ApiPropertyOptional({
    description: 'Social media profile links',
    type: SocialMediaLinksDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  socialMediaLinks?: SocialMediaLinksDto;
}

export class LegalItemDto {
  @ApiPropertyOptional({
    description: 'Legal item title',
    example: 'General Terms',
    type: String,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Legal item content',
    example: 'By using this service, you agree to ...',
    type: String,
  })
  @IsString()
  @IsOptional()
  content?: string;
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
    description: 'Organization contact phone numbers',
    example: ['+966501234567', '+966501234568'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  phoneNumbers?: any[];

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
  @IsString()
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
    description: 'Organization goals',
    example: 'Expand specialty care and improve patient access',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string;

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

  @ApiPropertyOptional({
    description: 'Social media profile links',
    type: SocialMediaLinksDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  socialMediaLinks?: SocialMediaLinksDto;

  @ApiPropertyOptional({
    description: 'Terms and conditions entries',
    type: [LegalItemDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LegalItemDto)
  termsConditions?: LegalItemDto[];

  @ApiPropertyOptional({
    description: 'Privacy policy entries',
    type: [LegalItemDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LegalItemDto)
  privacyPolicy?: LegalItemDto[];
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
