import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEmail,
  IsDateString,
  IsEnum, 
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  IsIn,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsMongoId,
  Matches,
  IsUrl
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import * as mongoose from 'mongoose';


// Employee Profile DTOs
export class CreateEmployeeShiftInputDto {
  @IsEnum(['organization', 'complex', 'clinic'])
  @IsNotEmpty()
  entityType: string;

  @IsMongoId()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  shiftName: string;

  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  @IsNotEmpty()
  dayOfWeek: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 08:00)'
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 17:00)'
  })
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(480)
  breakDurationMinutes?: number;
}

// Employee Profile DTOs
export class CreateEmployeeDto {
  // User Information (for User schema)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens'
  })
  username: string;
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

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @IsEnum(['doctor', 'nurse', 'technician', 'admin', 'receptionist', 'pharmacist', 'therapist', 'other'])
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsEnum(['male', 'female', 'other'])
  @IsNotEmpty()
  gender: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  // Employee Profile Information
  @IsString()
  @IsOptional()
  @MaxLength(20)
  employeeNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  cardNumber?: string;

  @IsEnum(['single', 'married', 'divorced', 'widowed', 'separated', 'other'])
  @IsOptional()
  maritalStatus?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  numberOfChildren?: number;

  @IsUrl()
  @IsOptional()
  profilePictureUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  jobTitle: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfHiring: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salary?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  socialSecurityNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  // Assignment Information
  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsMongoId()
  @IsOptional()
  complexId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  // ✅ Shifts Information (بدون userId)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeShiftInputDto)
  @IsOptional()
  shifts?: CreateEmployeeShiftInputDto[];
}



// نسخ كامل من CreateEmployeeDto مع جعل كل الحقول اختيارية
export class UpdateEmployeeDto {
  // User Information Updates (بدون password و role)
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
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens'
  })
  username?: string;


  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  // Employee Profile Updates
  @IsString()
  @IsOptional()
  @MaxLength(20)
  employeeNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  cardNumber?: string;

  @IsEnum(['single', 'married', 'divorced', 'widowed', 'separated', 'other'])
  @IsOptional()
  maritalStatus?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  numberOfChildren?: number;

  @IsUrl()
  @IsOptional()
  profilePictureUrl?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  jobTitle?: string;

  @IsDateString()
  @IsOptional()
  dateOfHiring?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salary?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  socialSecurityNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  // Shifts & Documents Updates
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateEmployeeShiftDto)
  @IsOptional()
  shifts?: UpdateEmployeeShiftDto[];

}



// Employee Document DTOs
export class CreateEmployeeDocumentDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['contract', 'certificate', 'work_permit', 'cv', 'id_copy', 'diploma', 'license', 'insurance', 'other'])
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  documentName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fileName?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fileSize?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  mimeType?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  issuingAuthority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  documentNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateEmployeeDocumentDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  documentName?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  issuingAuthority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  documentNumber?: string;

  @IsEnum(['active', 'expired', 'revoked', 'pending_renewal', 'archived'])
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

// Employee Shift DTOs
export class CreateEmployeeShiftDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['organization', 'complex', 'clinic'])
  @IsNotEmpty()
  entityType: string;

  @IsMongoId()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  shiftName: string;

  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  @IsNotEmpty()
  dayOfWeek: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 08:00)'
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 17:00)'
  })
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(480) // Max 8 hours break
  breakDurationMinutes?: number;
}

export class UpdateEmployeeShiftDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  shiftName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(480)
  breakDurationMinutes?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

// Search and Filter DTOs
export class EmployeeSearchQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search across name, email, employee number

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @IsEnum(['doctor', 'nurse', 'technician', 'admin', 'receptionist', 'pharmacist', 'therapist', 'other'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: mongoose.Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  complexId?: mongoose.Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  clinicId?: mongoose.Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsString()
  @IsOptional()
  dateHiredFrom?: string;

  @IsString()
  @IsOptional()
  dateHiredTo?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

// Bulk Operations DTOs
export class BulkEmployeeActionDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  employeeIds: string[];

  @IsEnum(['activate', 'deactivate', 'terminate', 'export'])
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

// Employee Performance DTOs
export class EmployeePerformanceDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  performancePeriod: string; // e.g., "Q1 2024", "January 2024"

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number; // 1-5 rating scale

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  feedback?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areasForImprovement?: string[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  recommendForPromotion?: boolean;
}

// Employee Statistics DTOs
export class EmployeeStatsDto {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newHiresThisMonth: number;
  newHiresThisYear: number;
  averageTenure: number; // In months
  employeesByRole: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  employeesByDepartment: Array<{
    department: string;
    count: number;
  }>;
  upcomingDocumentExpirations: Array<{
    employeeId: string;
    employeeName: string;
    documentType: string;
    expiryDate: Date;
    daysUntilExpiry: number;
  }>;
  salaryStatistics: {
    averageSalary: number;
    medianSalary: number;
    salaryRangeByRole: Array<{
      role: string;
      minSalary: number;
      maxSalary: number;
      averageSalary: number;
    }>;
  };
  genderDistribution: {
    male: number;
    female: number;
    other: number;
    malePercentage: number;
    femalePercentage: number;
  };
  ageDistribution: Array<{
    ageRange: string;
    count: number;
    percentage: number;
  }>;
  monthlyHiringTrend: Array<{
    month: string;
    count: number;
  }>;
}

// Employee Response DTOs
export class EmployeeResponseDto {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  nationality?: string;
  gender: string;
  dateOfBirth: Date;
  address?: string;
  isActive: boolean;
  
  // Employee Profile
  employeeNumber?: string;
  cardNumber?: string;
  maritalStatus?: string;
  numberOfChildren?: number;
  profilePictureUrl?: string;
  jobTitle: string;
  dateOfHiring: Date;
  salary?: number;
  bankAccount?: string;
  socialSecurityNumber?: string;
  taxId?: string;
  notes?: string;
  terminationDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Populated fields (optional)
  organization?: {
    _id: string;
    name: string;
  };
  complex?: {
    _id: string;
    name: string;
  };
  clinic?: {
    _id: string;
    name: string;
  };
  shifts?: Array<{
    _id: string;
    shiftName: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    breakDurationMinutes: number;
    entityType: string;
    entityId: string;
  }>;
  documents?: Array<{
    _id: string;
    documentType: string;
    documentName: string;
    status: string;
    expiryDate?: Date;
    isVerified: boolean;
  }>;
}

// Employee Assignment DTOs
export class AssignEmployeeDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(['organization', 'complex', 'clinic'])
  @IsNotEmpty()
  assignmentType: string;

  @IsMongoId()
  @IsNotEmpty()
  assignmentId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  assignmentNotes?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

// Employee Attendance DTOs
export class EmployeeAttendanceDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  checkInTime: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  checkOutTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1440) // Max 24 hours in minutes
  totalMinutesWorked?: number;

  @IsEnum(['present', 'absent', 'late', 'half_day', 'sick_leave', 'vacation'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class TerminateEmployeeDto {
  @IsDateString()
  @IsNotEmpty()
  terminationDate: string;

  @IsEnum(['resignation', 'termination', 'retirement', 'layoff', 'other'])
  @IsNotEmpty()
  terminationType: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  eligibleForRehire?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  finalNotes?: string;
} 
/**
 * DTO لإعادة تفعيل موظف منتهي الخدمة
 */
export class ReactivateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  newJobTitle?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  newSalary?: number;

  @IsDateString()
  @IsNotEmpty()
  dateOfReactivation: string;
}