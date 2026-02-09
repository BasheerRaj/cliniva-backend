import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactInfoDto, LegalInfoDto } from './shared-base.dto';
import { InheritanceSettingsDto } from './step-progress.dto';

export class ClinicCapacityDto {
  @ApiPropertyOptional({
    description: 'Maximum staff capacity',
    example: 50,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number; // Maximum staff capacity

  @ApiPropertyOptional({
    description: 'Maximum doctors capacity',
    example: 20,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number; // Maximum doctors capacity

  @ApiPropertyOptional({
    description: 'Maximum patients capacity',
    example: 100,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxPatients?: number; // Maximum patients capacity

  @ApiPropertyOptional({
    description: 'Default session duration in minutes',
    example: 30,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number; // Default session duration in minutes
}

export class ClinicServiceDto {
  @ApiProperty({
    description: 'Service name',
    example: 'General Consultation',
    type: String,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Comprehensive medical consultation',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service duration in minutes',
    example: 30,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number; // Service duration in minutes

  @ApiPropertyOptional({
    description: 'Service price',
    example: 150.0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  price?: number; // Service price

  @ApiPropertyOptional({
    description: 'Department ID this service belongs to',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string; // Department this service belongs to
}

// Clinic overview form - basic entity information
export class ClinicOverviewDto {
  @ApiProperty({
    description: 'Clinic name',
    example: "Al-Zahra Women's Clinic",
    type: String,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Head doctor name',
    example: 'Dr. Sarah Al-Mansour',
    type: String,
  })
  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @ApiPropertyOptional({
    description: 'Clinic specialization',
    example: 'Obstetrics and Gynecology',
    type: String,
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Medical license number',
    example: 'LIC-2024-12345',
    type: String,
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Clinic PIN or identifier',
    example: 'CLN-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  pin?: string; // Clinic PIN/identifier

  @ApiPropertyOptional({
    description: 'Clinic logo URL',
    example: 'https://example.com/clinic-logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Clinic website URL',
    example: 'https://alzahra-womens-clinic.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Department ID within complex',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string; // Department within complex

  // Business information - flattened for easier form handling
  @ApiPropertyOptional({
    description: 'Year the clinic was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Clinic mission statement',
    example: "To provide compassionate women's healthcare",
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Clinic vision statement',
    example: "To be the trusted choice for women's health",
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Clinic overview or description',
    example: "A specialized clinic for women's health and wellness",
    type: String,
  })
  @IsString()
  @IsOptional()
  overview?: string; // Clinic overview/description

  @ApiPropertyOptional({
    description: 'Clinic goals and objectives',
    example: 'Expand services to include prenatal care',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string; // Clinic goals

  @ApiPropertyOptional({
    description: 'Clinic director or CEO name',
    example: 'Dr. Layla Al-Harbi',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string; // Clinic director or CEO name

  @ApiPropertyOptional({
    description: 'Services offered by this clinic',
    type: [ClinicServiceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicServiceDto)
  @IsOptional()
  services?: ClinicServiceDto[]; // Services offered by this clinic

  // Inheritance settings to control data inheritance from parent entities
  @ApiPropertyOptional({
    description: 'Settings to control data inheritance from parent entities',
    type: InheritanceSettingsDto,
  })
  @ValidateNested()
  @Type(() => InheritanceSettingsDto)
  @IsOptional()
  inheritanceSettings?: InheritanceSettingsDto;

  // Note: Capacity fields removed from form, will use schema defaults
}

// Clinic contact form - extends standardized contact structure
export class ClinicContactDto extends ContactInfoDto {
  // Inherits all contact fields: phoneNumbers, email, address, emergencyContact, socialMediaLinks
}

export class ClinicWorkingHoursDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    example: 'monday',
  })
  @IsString()
  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  dayOfWeek:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

  @ApiProperty({
    description: 'Whether this is a working day',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  isWorkingDay: boolean;

  @ApiPropertyOptional({
    description: 'Opening time in HH:mm format',
    example: '09:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  openingTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Closing time in HH:mm format',
    example: '17:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  closingTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Break start time in HH:mm format',
    example: '12:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakStartTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Break end time in HH:mm format',
    example: '13:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakEndTime?: string; // HH:mm format

  // These will be validated against parent complex working hours
  @ApiPropertyOptional({
    description: 'Complex opening time for validation reference',
    example: '08:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexOpeningTime?: string; // For validation reference

  @ApiPropertyOptional({
    description: 'Complex closing time for validation reference',
    example: '20:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexClosingTime?: string; // For validation reference
}

export class ClinicBusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year the clinic was established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Clinic mission statement',
    example: 'To provide excellent patient care',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Clinic vision statement',
    example: 'To be the leading clinic in the region',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Head doctor name',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  headDoctorName?: string;
}

// Clinic legal form - extends standardized legal structure
export class ClinicLegalInfoDto extends LegalInfoDto {
  // Inherits all legal fields: vatNumber, crNumber, termsConditionsUrl, privacyPolicyUrl
}

// Combined DTO for clinic step completion
export class ClinicStepDto {
  @ApiProperty({
    description: 'Clinic overview information',
    type: ClinicOverviewDto,
  })
  @ValidateNested()
  @Type(() => ClinicOverviewDto)
  overview: ClinicOverviewDto;

  @ApiPropertyOptional({
    description: 'Clinic contact information',
    type: ClinicContactDto,
  })
  @ValidateNested()
  @Type(() => ClinicContactDto)
  @IsOptional()
  contact?: ClinicContactDto;

  @ApiPropertyOptional({
    description: 'Clinic business profile',
    type: ClinicBusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => ClinicBusinessProfileDto)
  @IsOptional()
  businessProfile?: ClinicBusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Clinic legal information',
    type: ClinicLegalInfoDto,
  })
  @ValidateNested()
  @Type(() => ClinicLegalInfoDto)
  @IsOptional()
  legalInfo?: ClinicLegalInfoDto;

  @ApiPropertyOptional({
    description: 'Clinic working hours schedule',
    type: [ClinicWorkingHoursDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicWorkingHoursDto)
  @IsOptional()
  workingHours?: ClinicWorkingHoursDto[];

  @ApiPropertyOptional({
    description: 'Skip to completion',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // Skip to completion

  @ApiPropertyOptional({
    description: 'Finalize clinic setup and complete onboarding',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // Finalize clinic setup and complete onboarding
}
