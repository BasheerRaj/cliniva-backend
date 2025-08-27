import { IsString, IsOptional, IsNumber, IsUrl, IsBoolean, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { 
  ContactInfoDto, 
  LegalInfoDto 
} from './shared-base.dto';
import { InheritanceSettingsDto } from './step-progress.dto';

export class ClinicCapacityDto {
  @IsNumber()
  @IsOptional()
  maxStaff?: number; // Maximum staff capacity

  @IsNumber()
  @IsOptional()
  maxDoctors?: number; // Maximum doctors capacity

  @IsNumber()
  @IsOptional()
  maxPatients?: number; // Maximum patients capacity

  @IsNumber()
  @IsOptional()
  sessionDuration?: number; // Default session duration in minutes
}

export class ClinicServiceDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number; // Service duration in minutes

  @IsNumber()
  @IsOptional()
  price?: number; // Service price

  @IsString()
  @IsOptional()
  complexDepartmentId?: string; // Department this service belongs to
}

// Clinic overview form - basic entity information
export class ClinicOverviewDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsString()
  @IsOptional()
  pin?: string; // Clinic PIN/identifier

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  complexDepartmentId?: string; // Department within complex

  // Business information - flattened for easier form handling
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
  overview?: string; // Clinic overview/description

  @IsString()
  @IsOptional()
  goals?: string; // Clinic goals

  @IsString()
  @IsOptional()
  ceoName?: string; // Clinic director or CEO name

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicServiceDto)
  @IsOptional()
  services?: ClinicServiceDto[]; // Services offered by this clinic

  // Inheritance settings to control data inheritance from parent entities
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
  @IsString()
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

  @IsBoolean()
  isWorkingDay: boolean;

  @IsString()
  @IsOptional()
  openingTime?: string; // HH:mm format

  @IsString()
  @IsOptional()
  closingTime?: string; // HH:mm format

  @IsString()
  @IsOptional()
  breakStartTime?: string; // HH:mm format

  @IsString()
  @IsOptional()
  breakEndTime?: string; // HH:mm format

  // These will be validated against parent complex working hours
  @IsString()
  @IsOptional()
  complexOpeningTime?: string; // For validation reference

  @IsString()
  @IsOptional()
  complexClosingTime?: string; // For validation reference
}

export class ClinicBusinessProfileDto {
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
  headDoctorName?: string;
}

// Clinic legal form - extends standardized legal structure
export class ClinicLegalInfoDto extends LegalInfoDto {
  // Inherits all legal fields: vatNumber, crNumber, termsConditionsUrl, privacyPolicyUrl
}

// Combined DTO for clinic step completion
export class ClinicStepDto {
  @ValidateNested()
  @Type(() => ClinicOverviewDto)
  overview: ClinicOverviewDto;

  @ValidateNested()
  @Type(() => ClinicContactDto)
  @IsOptional()
  contact?: ClinicContactDto;

  @ValidateNested()
  @Type(() => ClinicBusinessProfileDto)
  @IsOptional()
  businessProfile?: ClinicBusinessProfileDto;

  @ValidateNested()
  @Type(() => ClinicLegalInfoDto)
  @IsOptional()
  legalInfo?: ClinicLegalInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicWorkingHoursDto)
  @IsOptional()
  workingHours?: ClinicWorkingHoursDto[];

  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // Skip to completion

  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // Finalize clinic setup and complete onboarding
} 