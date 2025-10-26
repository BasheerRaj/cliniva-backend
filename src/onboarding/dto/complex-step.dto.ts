import { IsString, IsOptional, IsNumber, IsUrl, IsBoolean, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContactInfoDto,
  LegalInfoDto
} from './shared-base.dto';
import { InheritanceSettingsDto } from './step-progress.dto';

export class DepartmentInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// Complex overview form - basic entity information
export class ComplexOverviewDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;


  // Business information - flattened for easier form handling
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  overview?: string; // Complex overview/description

  @IsString()
  @IsOptional()
  description?: string; // Complex overview/description

  @IsString()
  @IsOptional()
  goals?: string; // Complex goals

  @IsString()
  @IsOptional()
  ceoName?: string; // Complex director or CEO name


  // New department names to create  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentInputDto)
  @IsOptional()
  departments?: DepartmentInputDto[];

  // keep backwards compatibility
  @IsArray()
  @IsOptional()
  newDepartmentNames?: string[];


  // Inheritance settings to control data inheritance from parent entities
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
}

// Complex legal form - extends standardized legal structure
export class ComplexLegalInfoDto extends LegalInfoDto {
  // Inherits all legal fields: vatNumber, crNumber, termsConditionsUrl, privacyPolicyUrl
}

// Combined DTO for complex step completion
export class ComplexStepDto {
  @ValidateNested()
  @Type(() => ComplexOverviewDto)
  overview: ComplexOverviewDto;

  @ValidateNested()
  @Type(() => ComplexContactDto)
  @IsOptional()
  contact?: ComplexContactDto;

  @ValidateNested()
  @Type(() => ComplexLegalInfoDto)
  @IsOptional()
  legalInfo?: ComplexLegalInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplexWorkingHoursDto)
  @IsOptional()
  workingHours?: ComplexWorkingHoursDto[];

  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean; // Skip to clinic setup

  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean; // Finalize complex setup
} 