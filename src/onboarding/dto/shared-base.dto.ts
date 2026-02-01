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

// Shared phone number DTO
export class PhoneNumberDto {
  @IsString()
  number: string;

  @IsEnum(['primary', 'secondary', 'emergency', 'fax', 'mobile'])
  type: 'primary' | 'secondary' | 'emergency' | 'fax' | 'mobile';

  @IsString()
  @IsOptional()
  label?: string;
}

// Shared address DTO
export class AddressDto {
  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;
}

// Shared emergency contact DTO
export class EmergencyContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}

// Shared social media links DTO
export class SocialMediaLinksDto {
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @IsUrl()
  @IsOptional()
  instagram?: string;

  @IsUrl()
  @IsOptional()
  twitter?: string;

  @IsUrl()
  @IsOptional()
  linkedin?: string;

  @IsUrl()
  @IsOptional()
  whatsapp?: string;

  @IsUrl()
  @IsOptional()
  youtube?: string;

  @IsUrl()
  @IsOptional()
  website?: string; // Secondary website
}

// Shared contact information DTO - used across all entities
export class ContactInfoDto {
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  @IsArray()
  @IsOptional()
  phoneNumbers?: PhoneNumberDto[];

  @IsEmail()
  @IsOptional()
  email?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ValidateNested()
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  @IsOptional()
  socialMediaLinks?: SocialMediaLinksDto;
}

// Shared business profile DTO - used across all entities
export class BusinessProfileDto {
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
  overview?: string; // Entity-specific description

  @IsString()
  @IsOptional()
  goals?: string; // Entity-specific goals

  @IsString()
  @IsOptional()
  ceoName?: string; // CEO, Director, Manager name
}

// Shared legal information DTO - used across all entities
export class LegalInfoDto {
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string; // Commercial registration number

  @IsUrl()
  @IsOptional()
  termsConditionsUrl?: string;

  @IsUrl()
  @IsOptional()
  privacyPolicyUrl?: string;
}
