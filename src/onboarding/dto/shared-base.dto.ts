import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Shared phone number DTO
export class PhoneNumberDto {
  @ApiProperty({
    description: 'Phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Phone number type',
    enum: ['primary', 'secondary', 'emergency', 'fax', 'mobile'],
    example: 'primary',
  })
  @IsEnum(['primary', 'secondary', 'emergency', 'fax', 'mobile'])
  type: 'primary' | 'secondary' | 'emergency' | 'fax' | 'mobile';

  @ApiPropertyOptional({
    description: 'Optional label for the phone number',
    example: 'Main Office',
    type: String,
  })
  @IsString()
  @IsOptional()
  label?: string;
}

// Shared address DTO
export class AddressDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: 'King Fahd Road',
    type: String,
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    description: 'City name',
    example: 'Riyadh',
    type: String,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'Riyadh Province',
    type: String,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '12345',
    type: String,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location URL or coordinates',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;
}

// Shared emergency contact DTO
export class EmergencyContactDto {
  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact email',
    example: 'emergency@example.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Relationship to the entity',
    example: 'Manager',
    type: String,
  })
  @IsString()
  @IsOptional()
  relationship?: string;
}

// Shared social media links DTO
export class SocialMediaLinksDto {
  @ApiPropertyOptional({
    description: 'Facebook page URL',
    example: 'https://facebook.com/cliniva',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL',
    example: 'https://instagram.com/cliniva',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Twitter profile URL',
    example: 'https://twitter.com/cliniva',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/company/cliniva',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp business number',
    example: 'https://wa.me/966501234567',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({
    description: 'YouTube channel URL',
    example: 'https://youtube.com/c/cliniva',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  youtube?: string;

  @ApiPropertyOptional({
    description: 'Secondary website URL',
    example: 'https://blog.cliniva.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string; // Secondary website
}

// Shared contact information DTO - used across all entities
export class ContactInfoDto {
  @ApiPropertyOptional({
    description: 'Array of phone numbers with types',
    type: [PhoneNumberDto],
    example: [
      { number: '+966501234567', type: 'primary', label: 'Main Office' },
      { number: '+966509876543', type: 'secondary', label: 'Reception' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  @IsArray()
  @IsOptional()
  phoneNumbers?: PhoneNumberDto[];

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'contact@cliniva.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address information',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiPropertyOptional({
    description: 'Emergency contact information',
    type: EmergencyContactDto,
  })
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({
    description: 'Social media profile links',
    type: SocialMediaLinksDto,
  })
  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  @IsOptional()
  socialMediaLinks?: SocialMediaLinksDto;
}

// Shared business profile DTO - used across all entities
export class BusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year the entity was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Mission statement',
    example: 'To provide excellent healthcare services',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Vision statement',
    example: 'To be the leading healthcare provider in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Entity overview or description',
    example: 'A comprehensive healthcare facility serving the community',
    type: String,
  })
  @IsString()
  @IsOptional()
  overview?: string; // Entity-specific description

  @ApiPropertyOptional({
    description: 'Entity goals and objectives',
    example: 'Expand services to underserved areas',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string; // Entity-specific goals

  @ApiPropertyOptional({
    description: 'Name of CEO, Director, or Manager',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string; // CEO, Director, Manager name
}

// Shared legal information DTO - used across all entities
export class LegalInfoDto {
  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: '300123456789003',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: '1010123456',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string; // Commercial registration number

  @ApiPropertyOptional({
    description: 'Terms and conditions document URL',
    example: 'https://cliniva.com/terms',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  termsConditionsUrl?: string;

  @ApiPropertyOptional({
    description: 'Privacy policy document URL',
    example: 'https://cliniva.com/privacy',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  privacyPolicyUrl?: string;
}
