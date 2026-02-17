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
  IsNumber,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for creating a new patient.
 * 
 * Required fields: cardNumber, firstName, lastName, dateOfBirth, gender
 * 
 * Business Rules:
 * - cardNumber must be unique (Requirement 1.2)
 * - cardNumber is immutable after creation (Requirement 4.2)
 * - patientNumber is auto-generated in format PAT{YEAR}{SEQUENCE} (Requirement 1.3)
 * - status defaults to "Active" (Requirement 1.1)
 */
export class CreatePatientDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  cardNumber: string;

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

  @IsEnum(['Active', 'Inactive'], {
    message: 'Status must be one of: Active, Inactive',
  })
  @IsOptional()
  status?: string;

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
  @MaxLength(50)
  nationality?: string;

  @IsEnum(['Single', 'Married', 'Divorced', 'Widowed', 'Other'])
  @IsOptional()
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  religion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];

  // Emergency Contact Information
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
  @MaxLength(50)
  emergencyContactRelationship?: string;

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

  // Insurance Information
  @IsString()
  @IsOptional()
  @MaxLength(100)
  insuranceCompany?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insuranceMemberNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insuranceMemberType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  insuranceProviderNetwork?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insurancePolicyId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  insuranceClass?: string;

  @IsNumber()
  @IsOptional()
  insuranceCoPayment?: number;

  @IsNumber()
  @IsOptional()
  insuranceCoverageLimit?: number;

  @IsDateString()
  @IsOptional()
  insuranceStartDate?: string;

  @IsDateString()
  @IsOptional()
  insuranceEndDate?: string;

  @IsEnum(['Active', 'Expired', 'Pending', 'None'])
  @IsOptional()
  insuranceStatus?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPortalEnabled?: boolean;
}

/**
 * Data Transfer Object for patient response.
 * Contains all patient fields returned in API responses.
 */
export class PatientResponseDto {
  _id: string;
  userId?: string;
  patientNumber: string;
  cardNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
  nationality?: string;
  maritalStatus?: string;
  religion?: string;
  preferredLanguage: string;
  profilePicture?: string;
  documents?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
  insuranceCompany?: string;
  insuranceStatus?: string;
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
  search?: string;

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
  status?: string;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  insuranceCompany?: string;

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
