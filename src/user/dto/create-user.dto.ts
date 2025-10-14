import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserType {
  STAFF = 'Staff Member',
  DOCTOR = 'Doctor',
}

export class WorkplaceDto {
  @IsString()
  complexId: string;

  @IsArray()
  @IsString({ each: true })
  clinicIds: string[];
}

export class WorkingShiftDto {
  @IsString()
  shiftName: string;

  @IsArray()
  @IsString({ each: true })
  days: string[];

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class DocumentDto {
  @IsString()
  documentType: string; // e.g., "CV", "Contract", "Certification"

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

export class CreateUserDto {
  // Account Info
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['staff', 'doctor', 'admin', 'owner', 'super_admin'])
  role: string;

  @IsEnum(UserType)
  userType: UserType;

  @ValidateNested()
  @Type(() => WorkplaceDto)
  workplace: WorkplaceDto;

  // Personal Info
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @IsOptional()
  numberOfChildren?: number;

  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  // Contact Info
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Employment
  @IsDateString()
  @IsOptional()
  dateOfHire?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialities?: string[];

  // Working schedule
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingShiftDto)
  @IsOptional()
  workingShifts?: WorkingShiftDto[];

  // Documents
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  @IsOptional()
  documents?: DocumentDto[];
}
