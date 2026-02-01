import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePatientDto {
  @IsString()
  @IsOptional()
  userId?: string; // Future: Link to user account for patient portal access

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be one of: male, female, other',
  })
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    message: 'Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
  })
  bloodType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  allergies?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  medicalHistory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insurancePolicyNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  preferredLanguage?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPortalEnabled?: boolean;
}

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be one of: male, female, other',
  })
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    message: 'Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
  })
  bloodType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  allergies?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  medicalHistory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insurancePolicyNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  preferredLanguage?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPortalEnabled?: boolean;
}

export class PatientResponseDto {
  _id: string;
  userId?: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  nationality?: string;
  preferredLanguage: string;
  isPortalEnabled: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class PatientSearchQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search in firstName, lastName, phone, email

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPortalEnabled?: boolean;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class UpdateMedicalHistoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  medicalHistory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  allergies?: string;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType?: string;
}

export class CreateEmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  contactName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  contactPhone: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  relationship?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;
}

export class PatientStatsDto {
  totalPatients: number;
  activePatients: number;
  malePatients: number;
  femalePatients: number;
  avgAge: number;
  patientsWithInsurance: number;
  patientsWithPortalAccess: number;
  recentPatients: number;
}
