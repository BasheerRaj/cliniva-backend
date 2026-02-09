import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({
    description: 'Contact type',
    example: 'phone',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  contactType: string;

  @ApiProperty({
    description: 'Contact value',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  contactValue: string;

  @ApiPropertyOptional({
    description: 'Whether the contact is active',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class WorkingHoursDto {
  @ApiPropertyOptional({
    description: 'Entity type this schedule belongs to',
    enum: ['organization', 'complex', 'clinic', 'user'],
    example: 'clinic',
  })
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic', 'user'])
  @IsOptional()
  entityType?: string; // Which entity this schedule belongs to

  @ApiPropertyOptional({
    description: 'ID of the specific entity (will be mapped during processing)',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  entityId?: string; // ID of the specific entity (will be mapped during processing)

  @ApiPropertyOptional({
    description: 'Human-readable name for mapping',
    example: 'Al-Zahra Complex',
    type: String,
  })
  @IsString()
  @IsOptional()
  entityName?: string; // Human-readable name for mapping (e.g., "Al-Zahra Complex", "Women's Clinic")

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
  dayOfWeek: string;

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
  openingTime?: string;

  @ApiPropertyOptional({
    description: 'Closing time in HH:mm format',
    example: '20:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiPropertyOptional({
    description: 'Break start time in HH:mm format',
    example: '13:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakStartTime?: string;

  @ApiPropertyOptional({
    description: 'Break end time in HH:mm format',
    example: '14:00',
    type: String,
  })
  @IsString()
  @IsOptional()
  breakEndTime?: string;
}

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
  crNumber?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions text or URL',
    example: 'https://example.com/terms',
    type: String,
  })
  @IsString()
  @IsOptional()
  termsConditions?: string;

  @ApiPropertyOptional({
    description: 'Privacy policy text or URL',
    example: 'https://example.com/privacy',
    type: String,
  })
  @IsString()
  @IsOptional()
  privacyPolicy?: string;
}

export class BusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year established',
    example: 2020,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Mission statement',
    example: 'To provide excellent healthcare',
    type: String,
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Vision statement',
    example: 'To be the leading healthcare provider',
    type: String,
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'CEO or director name',
    example: 'Dr. Ahmed Al-Saud',
    type: String,
  })
  @IsString()
  @IsOptional()
  ceoName?: string;
}

export class OrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Al-Zahra Healthcare Group',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Legal name',
    example: 'Al-Zahra Healthcare Group LLC',
    type: String,
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Registration number',
    example: 'REG-2024-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@alzahra.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'King Fahd Road, Riyadh',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://alzahra.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Business profile information',
    type: BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information',
    type: LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class ComplexDto {
  @ApiProperty({
    description: 'Complex name',
    example: 'Al-Zahra Medical Complex',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'King Fahd Road, Riyadh',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@alzahra-complex.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/complex-logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://alzahra-complex.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Manager name',
    example: 'Dr. Fatima Al-Rashid',
    type: String,
  })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({
    description: 'Array of department IDs',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Business profile information',
    type: BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information',
    type: LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class CapacityDto {
  @ApiPropertyOptional({
    description: 'Maximum staff capacity',
    example: 50,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({
    description: 'Maximum doctors capacity',
    example: 20,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({
    description: 'Maximum patients capacity',
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
}

export class ClinicDto {
  @ApiProperty({
    description: 'Clinic name',
    example: "Al-Zahra Women's Clinic",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'King Fahd Road, Riyadh',
    type: String,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location',
    example: 'https://maps.google.com/?q=24.7136,46.6753',
    type: String,
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@alzahra-clinic.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Medical license number',
    example: 'LIC-2024-12345',
    type: String,
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/clinic-logo.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://alzahra-clinic.com',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

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
    description: 'Clinic PIN or identifier',
    example: 'CLN-001',
    type: String,
  })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({
    description: 'Complex department ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  // Services managed through ClinicService junction table

  @ApiPropertyOptional({
    description: 'Clinic capacity information',
    type: CapacityDto,
  })
  @ValidateNested()
  @Type(() => CapacityDto)
  @IsOptional()
  capacity?: CapacityDto;

  @ApiPropertyOptional({
    description: 'Business profile information',
    type: BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information',
    type: LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class DepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Cardiology',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Heart and cardiovascular care',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ServiceDto {
  @ApiProperty({
    description: 'Service name',
    example: 'General Consultation',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
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
    default: 30,
  })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number = 30;

  @ApiPropertyOptional({
    description: 'Service price',
    example: 150.0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Complex department ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;
}

export class UserDataDto {
  @ApiProperty({
    description: 'User first name',
    example: 'Ahmed',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Al-Saud',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmed.alsaud@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ssw0rd',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User nationality',
    example: 'Saudi Arabian',
    type: String,
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '1990-01-15',
    type: String,
  })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    enum: ['male', 'female', 'other'],
    example: 'male',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;
}

export class SubscriptionDataDto {
  @ApiProperty({
    description: 'Subscription plan type',
    enum: ['company', 'complex', 'clinic'],
    example: 'clinic',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: string;

  @ApiProperty({
    description: 'Subscription plan ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class CompleteOnboardingDto {
  @ApiProperty({
    description: 'User data for account creation',
    type: UserDataDto,
  })
  @ValidateNested()
  @Type(() => UserDataDto)
  @IsNotEmpty()
  userData: UserDataDto;

  @ApiProperty({
    description: 'Subscription plan data',
    type: SubscriptionDataDto,
  })
  @ValidateNested()
  @Type(() => SubscriptionDataDto)
  @IsNotEmpty()
  subscriptionData: SubscriptionDataDto;

  @ApiPropertyOptional({
    description: 'Organization data (required for company plan)',
    type: OrganizationDto,
  })
  @ValidateNested()
  @Type(() => OrganizationDto)
  @IsOptional()
  organization?: OrganizationDto;

  @ApiPropertyOptional({
    description: 'Array of medical complexes',
    type: [ComplexDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplexDto)
  @IsOptional()
  complexes?: ComplexDto[];

  @ApiPropertyOptional({
    description: 'Array of departments',
    type: [DepartmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  @IsOptional()
  departments?: DepartmentDto[];

  @ApiPropertyOptional({
    description: 'Array of clinics',
    type: [ClinicDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicDto)
  @IsOptional()
  clinics?: ClinicDto[];

  @ApiPropertyOptional({
    description: 'Array of medical services',
    type: [ServiceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  @IsOptional()
  services?: ServiceDto[];

  @ApiPropertyOptional({
    description: 'Array of working hours schedules',
    type: [WorkingHoursDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto[];

  @ApiPropertyOptional({
    description: 'Array of contact information',
    type: [ContactDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @IsOptional()
  contacts?: ContactDto[];

  @ApiPropertyOptional({
    description: 'Legal information',
    type: LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}
