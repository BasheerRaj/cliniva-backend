import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, IsNumber } from 'class-validator';

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
