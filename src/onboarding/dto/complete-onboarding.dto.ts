import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, IsBoolean, IsEmail, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// Contact DTO
export class ContactDto {
  @ApiProperty({
    description: 'Type of contact (e.g., phone, email, fax)',
    example: 'phone',
  })
  @IsString()
  @IsNotEmpty()
  contactType: string;

  @ApiProperty({
    description: 'Value of the contact (e.g., phone number, email address)',
    example: '+966500000000',
  })
  @IsString()
  @IsNotEmpty()
  contactValue: string;

  @ApiPropertyOptional({
    description: 'Whether the contact is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

// Working Hours DTO
export class WorkingHoursDto {
  @ApiPropertyOptional({
    description: 'Entity type this schedule belongs to',
    enum: ['organization', 'complex', 'clinic'],
  })
  @IsEnum(['organization', 'complex', 'clinic'])
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'ID of the specific entity',
    example: '64a7c83e5f6d4b001c3e2a89',
  })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Human-readable entity name',
    example: 'Al-Zahra Complex',
  })
  @IsString()
  @IsOptional()
  entityName?: string;

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
    description: 'Whether it is a working day',
    example: true,
  })
  @IsBoolean()
  isWorkingDay: boolean;

  @ApiPropertyOptional({
    description: 'Opening time (HH:mm format)',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiPropertyOptional({
    description: 'Closing time (HH:mm format)',
    example: '17:00',
  })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiPropertyOptional({
    description: 'Break start time (HH:mm format)',
    example: '12:00',
  })
  @IsString()
  @IsOptional()
  breakStartTime?: string;

  @ApiPropertyOptional({
    description: 'Break end time (HH:mm format)',
    example: '13:00',
  })
  @IsString()
  @IsOptional()
  breakEndTime?: string;
}

// ================== Legal Info DTO ==================
export class LegalInfoDto {
  @ApiPropertyOptional({
    description: 'VAT registration number of the organization',
    example: '310122334455',
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: 'Commercial Registration number',
    example: 'CR-20304050',
  })
  @IsString()
  @IsOptional()
  crNumber?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions text or link',
    example: 'https://example.com/terms',
  })
  @IsString()
  @IsOptional()
  termsConditions?: string;

  @ApiPropertyOptional({
    description: 'Privacy policy text or link',
    example: 'https://example.com/privacy',
  })
  @IsString()
  @IsOptional()
  privacyPolicy?: string;
}

// ================== Business Profile DTO ==================
export class BusinessProfileDto {
  @ApiPropertyOptional({
    description: 'Year the organization was established',
    example: 1995,
  })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({
    description: 'Mission statement of the organization',
    example: 'Providing high-quality healthcare services to the community',
  })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({
    description: 'Vision statement of the organization',
    example: 'To be the leading healthcare provider in the region',
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({
    description: 'Name of the CEO',
    example: 'Dr. Mohammed Al-Qahtani',
  })
  @IsString()
  @IsOptional()
  ceoName?: string;
}


// ================== Organization DTO ==================
export class OrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Al-Zahra Medical Center',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Legal name of the organization',
    example: 'Al-Zahra Healthcare Co. Ltd.',
  })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Official registration number',
    example: 'REG-20304050',
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Primary contact phone number',
    example: '+966500112233',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Primary contact email',
    example: 'info@alzahra.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the organization',
    example: 'King Fahd Road, Riyadh, Saudi Arabia',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location link',
    example: 'https://goo.gl/maps/example',
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Official website URL',
    example: 'https://alzahra.com',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Business profile details',
    type: () => BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information details',
    type: () => LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

// ================== Complex DTO ==================
export class ComplexDto {
  @ApiProperty({
    description: 'Name of the complex',
    example: 'Al-Zahra Healthcare Complex',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Address of the complex',
    example: 'Olaya Street, Riyadh, Saudi Arabia',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location link',
    example: 'https://goo.gl/maps/example-complex',
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+966511223344',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'contact@alzahracomplex.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Complex logo URL',
    example: 'https://example.com/complex-logo.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Complex website URL',
    example: 'https://alzahracomplex.com',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Name of the manager of the complex',
    example: 'Eng. Abdullah Al-Harbi',
  })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({
    description: 'List of department IDs belonging to the complex',
    example: ['dep-123', 'dep-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Business profile details of the complex',
    type: () => BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information of the complex',
    type: () => LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}



// ================== Capacity DTO ==================
export class CapacityDto {
  @ApiPropertyOptional({
    description: 'Maximum number of staff allowed',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of doctors allowed',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of patients allowed',
    example: 200,
  })
  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @ApiPropertyOptional({
    description: 'Default session duration in minutes',
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number;
}

// ================== Clinic DTO ==================
export class ClinicDto {
  @ApiProperty({
    description: 'Name of the clinic',
    example: 'Al-Zahra Family Clinic',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Address of the clinic',
    example: 'Prince Sultan Street, Jeddah, Saudi Arabia',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Google Maps location link',
    example: 'https://goo.gl/maps/example-clinic',
  })
  @IsString()
  @IsOptional()
  googleLocation?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+966599887766',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'clinic@alzahra.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Official license number of the clinic',
    example: 'LIC-2024001',
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Clinic logo URL',
    example: 'https://example.com/clinic-logo.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Clinic official website',
    example: 'https://alzahraclinic.com',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Head doctor of the clinic',
    example: 'Dr. Aisha Al-Qahtani',
  })
  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @ApiPropertyOptional({
    description: 'Clinic specialization',
    example: 'Pediatrics',
  })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Unique PIN code for clinic identification',
    example: 'CLINIC-1234',
  })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({
    description: 'Complex department ID if the clinic is part of a complex',
    example: 'dep-789',
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Capacity details of the clinic',
    type: () => CapacityDto,
  })
  @ValidateNested()
  @Type(() => CapacityDto)
  @IsOptional()
  capacity?: CapacityDto;

  @ApiPropertyOptional({
    description: 'Business profile information of the clinic',
    type: () => BusinessProfileDto,
  })
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ApiPropertyOptional({
    description: 'Legal information of the clinic',
    type: () => LegalInfoDto,
  })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}



// ================== Department DTO ==================
export class DepartmentDto {
  @ApiProperty({
    description: 'Name of the department',
    example: 'Cardiology',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the department',
    example: 'Handles heart and cardiovascular diseases',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

// ================== Service DTO ==================
export class ServiceDto {
  @ApiProperty({
    description: 'Name of the medical service',
    example: 'General Consultation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the service',
    example: 'A 30-minute consultation with a general practitioner',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Duration of the service in minutes',
    example: 30,
    default: 30,
  })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number = 30;

  @ApiPropertyOptional({
    description: 'Price of the service in SAR',
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Associated complex department ID',
    example: 'dep-12345',
  })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;
}

export class UserDataDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: '+123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'American' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], example: 'male' })
  @IsString()
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;
}

export class SubscriptionDataDto {
  @ApiProperty({ enum: ['company', 'complex', 'clinic'], example: 'company' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: string;

  @ApiProperty({ example: 'plan_12345' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class CompleteOnboardingDto {
  @ApiProperty({ type: UserDataDto })
  @ValidateNested()
  @Type(() => UserDataDto)
  @IsNotEmpty()
  userData: UserDataDto;

  @ApiProperty({ type: SubscriptionDataDto })
  @ValidateNested()
  @Type(() => SubscriptionDataDto)
  @IsNotEmpty()
  subscriptionData: SubscriptionDataDto;

  @ApiPropertyOptional({ type: OrganizationDto })
  @ValidateNested()
  @Type(() => OrganizationDto)
  @IsOptional()
  organization?: OrganizationDto;

  @ApiPropertyOptional({ type: [ComplexDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplexDto)
  @IsOptional()
  complexes?: ComplexDto[];

  @ApiPropertyOptional({ type: [DepartmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  @IsOptional()
  departments?: DepartmentDto[];

  @ApiPropertyOptional({ type: [ClinicDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicDto)
  @IsOptional()
  clinics?: ClinicDto[];

  @ApiPropertyOptional({ type: [ServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  @IsOptional()
  services?: ServiceDto[];

  @ApiPropertyOptional({ type: [WorkingHoursDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto[];

  @ApiPropertyOptional({ type: [ContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @IsOptional()
  contacts?: ContactDto[];

  @ApiPropertyOptional({ type: LegalInfoDto })
  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

