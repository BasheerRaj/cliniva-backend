import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Shared phone number DTO
export class PhoneNumberDto {
  @ApiProperty({ description: 'Phone number value', example: '+123456789' })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Type of phone number',
    enum: ['primary', 'secondary', 'emergency', 'fax', 'mobile'],
    example: 'primary'
  })
  @IsEnum(['primary', 'secondary', 'emergency', 'fax', 'mobile'])
  type: 'primary' | 'secondary' | 'emergency' | 'fax' | 'mobile';

  @ApiProperty({ description: 'Optional label for the phone number', example: 'Office', required: false })
  @IsString()
  @IsOptional()
  label?: string;
}

// Shared address DTO
export class AddressDto {
  @ApiProperty({ description: 'Street name', example: '123 Main St', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ description: 'Country name', example: 'Germany', required: false })
  @IsString()
  @IsOptional()
  country?: string;
  
  @IsString()
  @IsOptional()
  region?: string;
  @IsString()
  @IsOptional()
  nation?: string;
  @IsNumber()
  @IsOptional()
  buildingNumber?: number;

  @ApiProperty({ description: 'Google location URL or coordinates', example: 'https://goo.gl/maps/xyz', required: false })
  @IsString()
  @IsOptional()
  googleLocation?: string;

}

// Shared emergency contact DTO
export class EmergencyContactDto {
  @ApiProperty({ description: 'Name of emergency contact', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Phone of emergency contact', example: '+123456789', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Email of emergency contact', example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Relationship to the entity', example: 'Manager', required: false })
  @IsString()
  @IsOptional()
  relationship?: string;
}

// Shared social media links DTO
export class SocialMediaLinksDto {
  @ApiProperty({ description: 'Facebook URL', example: 'https://facebook.com/example', required: false })
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @ApiProperty({ description: 'Instagram URL', example: 'https://instagram.com/example', required: false })
  @IsUrl()
  @IsOptional()
  instagram?: string;

  @ApiProperty({ description: 'Twitter URL', example: 'https://twitter.com/example', required: false })
  @IsUrl()
  @IsOptional()
  twitter?: string;

  @ApiProperty({ description: 'LinkedIn URL', example: 'https://linkedin.com/company/example', required: false })
  @IsUrl()
  @IsOptional()
  linkedin?: string;
}

// Shared contact information DTO
export class ContactInfoDto {
  @ApiProperty({ type: [PhoneNumberDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  @IsArray()
  @IsOptional()
  phoneNumbers?: PhoneNumberDto[];

  @ApiProperty({ description: 'Email address', example: 'info@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ type: AddressDto, required: false })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiProperty({ type: SocialMediaLinksDto, required: false })
  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  @IsOptional()
  socialMediaLinks?: SocialMediaLinksDto;
}

// Shared business profile DTO
export class BusinessProfileDto {
  @ApiProperty({ description: 'Year established', example: 2005, required: false })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiProperty({ description: 'Mission statement', example: 'Provide best service', required: false })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiProperty({ description: 'Vision statement', example: 'Become market leader', required: false })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiProperty({ description: 'Overview description', example: 'Healthcare services overview', required: false })
  @IsString()
  @IsOptional()
  overview?: string;

  @ApiProperty({ description: 'Goals of entity', example: 'Expand service coverage', required: false })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiProperty({ description: 'CEO or Director name', example: 'Dr. John Smith', required: false })
  @IsString()
  @IsOptional()
  ceoName?: string;
}

export class LegalDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
// Shared legal information DTO
export class LegalInfoDto {
  @ApiProperty({ description: 'VAT number', example: 'DE123456789', required: false })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiProperty({ description: 'Commercial registration number', example: 'HRB12345', required: false })
  @IsString()
  @IsOptional()
  crNumber?: string;


  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocumentDto)
  @IsOptional()
  termsAndConditions?: LegalDocumentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalDocumentDto)
  @IsOptional()
  privacyPolicies?: LegalDocumentDto[];
}
