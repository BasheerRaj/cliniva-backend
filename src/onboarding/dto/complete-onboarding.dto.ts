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

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  contactType: string;

  @IsString()
  @IsNotEmpty()
  contactValue: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class WorkingHoursDto {
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic', 'user'])
  @IsOptional()
  entityType?: string; // Which entity this schedule belongs to

  @IsString()
  @IsOptional()
  entityId?: string; // ID of the specific entity (will be mapped during processing)

  @IsString()
  @IsOptional()
  entityName?: string; // Human-readable name for mapping (e.g., "Al-Zahra Complex", "Women's Clinic")

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

  @IsBoolean()
  isWorkingDay: boolean;

  @IsString()
  @IsOptional()
  openingTime?: string;

  @IsString()
  @IsOptional()
  closingTime?: string;

  @IsString()
  @IsOptional()
  breakStartTime?: string;

  @IsString()
  @IsOptional()
  breakEndTime?: string;
}

export class LegalInfoDto {
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsString()
  @IsOptional()
  privacyPolicy?: string;
}

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
  ceoName?: string;
}

export class OrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class ComplexDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class CapacityDto {
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @IsNumber()
  @IsOptional()
  sessionDuration?: number;
}

export class ClinicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleLocation?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  pin?: string;

  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  // Services managed through ClinicService junction table

  @ValidateNested()
  @Type(() => CapacityDto)
  @IsOptional()
  capacity?: CapacityDto;

  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  businessProfile?: BusinessProfileDto;

  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}

export class DepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number = 30;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  complexDepartmentId?: string;
}

export class UserDataDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;
}

export class SubscriptionDataDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: string;

  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class CompleteOnboardingDto {
  @ValidateNested()
  @Type(() => UserDataDto)
  @IsNotEmpty()
  userData: UserDataDto;

  @ValidateNested()
  @Type(() => SubscriptionDataDto)
  @IsNotEmpty()
  subscriptionData: SubscriptionDataDto;

  @ValidateNested()
  @Type(() => OrganizationDto)
  @IsOptional()
  organization?: OrganizationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplexDto)
  @IsOptional()
  complexes?: ComplexDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentDto)
  @IsOptional()
  departments?: DepartmentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicDto)
  @IsOptional()
  clinics?: ClinicDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  @IsOptional()
  services?: ServiceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @IsOptional()
  contacts?: ContactDto[];

  @ValidateNested()
  @Type(() => LegalInfoDto)
  @IsOptional()
  legalInfo?: LegalInfoDto;
}
