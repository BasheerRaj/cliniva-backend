import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicDto {
  @ApiPropertyOptional({
    description: 'Complex department ID (NULL for clinic-only plans)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Complex ID (direct reference to complex)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexId?: string;

  @ApiProperty({
    description: 'Subscription ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Owner user ID (user who owns/manages this clinic)',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({
    description: 'Clinic name',
    example: 'Cardiology Clinic',
    type: String,
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Clinic address',
    example: '123 Medical Street, Riyadh',
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
    description: 'Clinic phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Clinic email address',
    example: 'cardiology@example.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Clinic license number',
    example: 'LIC-2024-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Clinic logo URL',
    example: 'https://example.com/logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Clinic website URL',
    example: 'https://cardiology-clinic.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Head doctor name',
    example: 'Dr. Ahmed Al-Saudi',
    type: String,
  })
  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @ApiPropertyOptional({
    description: 'Clinic specialization',
    example: 'Cardiology',
    type: String,
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Clinic PIN code',
    example: '1234',
    type: String,
  })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({
    description: 'Year clinic was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Clinic mission statement',
    example: 'Providing excellent cardiac care',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Clinic vision statement',
    example: 'To be the leading cardiology center',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Ahmed Al-Saudi',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: 'VAT-123456789',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: 'CR-987654321',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of staff members',
    example: 15,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of doctors',
    example: 10,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of patients',
    example: 100,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @ApiPropertyOptional({
    description: 'Default session duration in minutes',
    example: 30,
    type: Number,
    minimum: 15,
    maximum: 480,
  })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number;
}

export class UpdateClinicDto {
  @ApiPropertyOptional({
    description: 'Clinic name',
    example: 'Advanced Cardiology Clinic',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Legal name of the clinic',
    example: 'Cardiology Medical Center LLC',
    type: String,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Clinic address',
    example: '123 Medical Street, Riyadh',
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
    description: 'Clinic phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Clinic email address',
    example: 'cardiology@example.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Clinic license number',
    example: 'LIC-2024-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Clinic logo URL',
    example: 'https://example.com/logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Clinic website URL',
    example: 'https://cardiology-clinic.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Head doctor name',
    example: 'Dr. Ahmed Al-Saudi',
    type: String,
  })
  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @ApiPropertyOptional({
    description: 'Clinic specialization',
    example: 'Cardiology',
    type: String,
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Clinic PIN code',
    example: '1234',
    type: String,
  })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({
    description: 'Year clinic was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Clinic mission statement',
    example: 'Providing excellent cardiac care',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Clinic vision statement',
    example: 'To be the leading cardiology center',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Clinic goals',
    example: 'Expand services to 5 locations',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Ahmed Al-Saudi',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: 'VAT-123456789',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: 'CR-987654321',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of staff members',
    example: 15,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of doctors',
    example: 10,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of patients',
    example: 100,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @ApiPropertyOptional({
    description: 'Default session duration in minutes',
    example: 30,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number;

  @ApiPropertyOptional({
    description: 'Complex department ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Inherit settings from complex',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  inheritsFromComplex?: boolean;

  @ApiPropertyOptional({
    description: 'Inherit settings from organization',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  inheritsFromOrganization?: boolean;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Riyadh',
    type: String,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State/Province',
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
    description: 'Country',
    example: 'Saudi Arabia',
    type: String,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Dr. Mohammed Ali',
    type: String,
  })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone',
    example: '+966501234568',
    type: String,
  })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Phone numbers array',
    example: ['+966501234567', '+966501234568'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  phoneNumbers?: any[];

  @ApiPropertyOptional({
    description: 'Social media links',
    example: {
      facebook: 'https://facebook.com/clinic',
      twitter: 'https://twitter.com/clinic',
    },
    type: Object,
  })
  @IsOptional()
  socialMediaLinks?: any;

  @ApiPropertyOptional({
    description: 'Terms and conditions URL',
    example: 'https://clinic.com/terms',
    type: String,
  })
  @IsString()
  @IsOptional()
  termsConditionsUrl?: string;

  @ApiPropertyOptional({
    description: 'Privacy policy URL',
    example: 'https://clinic.com/privacy',
    type: String,
  })
  @IsString()
  @IsOptional()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional({
    description: 'Schedule data',
    type: Object,
  })
  @IsOptional()
  scheduleData?: any;
}

export class SetupCapacityDto {
  @ApiPropertyOptional({
    description: 'Maximum number of staff members',
    example: 15,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of doctors',
    example: 10,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of patients',
    example: 100,
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @ApiPropertyOptional({
    description: 'Default session duration in minutes',
    example: 30,
    type: Number,
    minimum: 15,
    maximum: 480,
  })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number;
}

export class SetupBusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year clinic was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Clinic mission statement',
    example: 'Providing excellent cardiac care',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Clinic vision statement',
    example: 'To be the leading cardiology center',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO name',
    example: 'Ahmed Al-Saudi',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({
    description: 'VAT registration number',
    example: 'VAT-123456789',
    type: String,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial registration number',
    example: 'CR-987654321',
    type: String,
  })
  @IsString()
  @IsOptional()
  crNumber?: string;
}
