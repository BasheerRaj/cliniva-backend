import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  IsIn,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for updating patient information.
 *
 * IMPORTANT: cardNumber is NOT included in this DTO as it is immutable
 * per business rules (Requirements 4.2, M5 specification).
 *
 * All fields are optional to allow partial updates.
 */
export class UpdatePatientDto {
  // NOTE: cardNumber is intentionally excluded - it is immutable after creation

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

  // Medical Information
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
