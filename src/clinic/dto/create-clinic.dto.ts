import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsOptional()
  complexDepartmentId?: string; // NULL for clinic-only plans

  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

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

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;

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

export class UpdateClinicDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  legalName?: string;

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
  goals?: string;

  @IsString()
  @IsOptional()
  ceoName?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;

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

  // Services managed through ClinicService junction table

  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @IsBoolean()
  @IsOptional()
  inheritsFromComplex?: boolean;

  @IsBoolean()
  @IsOptional()
  inheritsFromOrganization?: boolean;

  // Contact information fields  
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
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsArray()
  @IsOptional()
  phoneNumbers?: any[];

  @IsOptional()
  socialMediaLinks?: any;

  // Legal information fields
  @IsString()
  @IsOptional()
  termsConditionsUrl?: string;

  @IsString()
  @IsOptional()
  privacyPolicyUrl?: string;

  // Schedule data
  @IsOptional()
  scheduleData?: any;
}

export class SetupCapacityDto {
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

export class SetupBusinessProfileDto {
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

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  crNumber?: string;
}
