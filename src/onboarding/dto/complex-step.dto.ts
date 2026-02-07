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

// Complex overview form - basic entity information
export class ComplexOverviewDto {
  @ApiProperty({
    description: 'Medical complex name',
    example: 'Al-Zahra Medical Complex',
    type: String,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Complex manager name',
    example: 'Dr. Fatima Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({
    description: 'Complex logo URL',
    example: 'https://example.com/complex-logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Complex website URL',
    example: 'https://alzahra-complex.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  // Business information - flattened for easier form handling
  @ApiPropertyOptional({
    description: 'Year the complex was established',
    example: 2018,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Complex mission statement',
    example: 'To provide comprehensive medical services under one roof',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Complex vision statement',
    example: 'To be the premier medical complex in the city',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Complex overview or description',
    example: 'A state-of-the-art medical facility with multiple specialties',
    type: String,
  })
  @IsString()
  @IsOptional()
  overview?: string; // Complex overview/description

  @ApiPropertyOptional({
    description: 'Complex goals and objectives',
    example: 'Expand services to include advanced diagnostics',
    type: String,
  })
  @IsString()
  @IsOptional()
  goals?: string; // Complex goals

  @ApiPropertyOptional({
    description: 'Complex director or CEO name',
    example: 'Dr. Mohammed Al-Harbi',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string; // Complex director or CEO name

  // Department management
  @ApiPropertyOptional({
    description: 'Array of pre-existing department IDs to assign',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[]; // Pre-existing department IDs to assign

  @ApiPropertyOptional({
    description: 'Array of new department names to create',
    example: ['Cardiology', 'Pediatrics', 'Orthopedics'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  newDepartmentNames?: string[]; // New department names to create

  // Inheritance settings to control data inheritance from parent entities
  @ApiPropertyOptional({
    description: 'Settings to control data inheritance from parent entities',
    type: InheritanceSettingsDto,
  })
  @ValidateNested()
  @Type(() => InheritanceSettingsDto)
  @IsOptional()
  inheritanceSettings?: InheritanceSettingsDto;
}

// Complex contact form - extends standardized contact structure
export class ComplexContactDto extends ContactInfoDto {
  // Inherits all contact fields: phoneNumbers, email, address, emergencyContact, socialMediaLinks
}

export class ComplexWorkingHoursDto {
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
    example: '08:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  openingTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Closing time in HH:mm format',
    example: '20:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  closingTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Break start time in HH:mm format',
    example: '13:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakStartTime?: string; // HH:mm format

  @ApiPropertyOptional({
    description: 'Break end time in HH:mm format',
    example: '14:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakEndTime?: string; // HH:mm format
}

// Complex legal form - extends standardized legal structure
export class ComplexLegalInfoDto extends LegalInfoDto {
  // Inherits all legal fields: vatNumber, crNumber, termsConditionsUrl, privacyPolicyUrl
}

// Combined DTO for complex step completion
export class ComplexStepDto {
  @ApiProperty({
    description: 'Complex overview information',
    type: ComplexOverviewDto,
  })
  @ValidateNested()
  @Type(() => ComplexOverviewDto)
  overview: ComplexOverviewDto;

  @ApiPropertyOptional({
    description: 'Complex contact information',
    type: ComplexContactDto,
  })
  @ValidateNested()
  @Type(() => ComplexContactDto)
  @IsOptional()
  contact?: ComplexContactDto;

  @ApiPropertyOptional({
    description: 'Complex legal information',
    type: ComplexLegalInfoDto,
  })
  @ValidateNested()
  @Type(() => ComplexLegalInfoDto)
  @IsOptional()
  legalInfo?: ComplexLegalInfoDto;

  @ApiPropertyOptional({
    description: 'Complex working hours schedule',
    type: [ComplexWorkingHoursDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplexWorkingHoursDto)
  @IsOptional()
  workingHours?: ComplexWorkingHoursDto[];

  @ApiPropertyOptional({
    description: 'Skip to clinic setup',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // Skip to clinic setup

  @ApiPropertyOptional({
    description: 'Finalize complex setup',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // Finalize complex setup
}
