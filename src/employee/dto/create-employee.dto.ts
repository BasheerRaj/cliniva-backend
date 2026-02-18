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
  IsUrl,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Employee Profile DTOs
export class CreateEmployeeDto {
  // User Information (for User schema)
  @ApiProperty({
    description: 'Employee email address (must be unique)',
    example: 'john.doe@cliniva.com',
    type: String,
  })
  @IsEmail(
    {},
    {
      message: JSON.stringify({
        ar: 'البريد الإلكتروني غير صالح',
        en: 'Invalid email address',
      }),
    },
  )
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'البريد الإلكتروني مطلوب',
      en: 'Email is required',
    }),
  })
  email: string;

  @ApiProperty({
    description: 'Employee password (minimum 8 characters)',
    example: 'SecurePass123!',
    type: String,
    minLength: 8,
    maxLength: 50,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تكون نصاً',
      en: 'Password must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'كلمة المرور مطلوبة',
      en: 'Password is required',
    }),
  })
  @MinLength(8, {
    message: JSON.stringify({
      ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      en: 'Password must be at least 8 characters long',
    }),
  })
  @MaxLength(50, {
    message: JSON.stringify({
      ar: 'كلمة المرور يجب ألا تتجاوز 50 حرفاً',
      en: 'Password cannot exceed 50 characters',
    }),
  })
  password: string;

  @ApiProperty({
    description: 'Employee first name',
    example: 'John',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الاسم الأول يجب أن يكون نصاً',
      en: 'First name must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الاسم الأول مطلوب',
      en: 'First name is required',
    }),
  })
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'الاسم الأول يجب أن يكون حرفين على الأقل',
      en: 'First name must be at least 2 characters long',
    }),
  })
  @MaxLength(50, {
    message: JSON.stringify({
      ar: 'الاسم الأول يجب ألا يتجاوز 50 حرفاً',
      en: 'First name cannot exceed 50 characters',
    }),
  })
  firstName: string;

  @ApiProperty({
    description: 'Employee last name',
    example: 'Doe',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'اسم العائلة يجب أن يكون نصاً',
      en: 'Last name must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'اسم العائلة مطلوب',
      en: 'Last name is required',
    }),
  })
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'اسم العائلة يجب أن يكون حرفين على الأقل',
      en: 'Last name must be at least 2 characters long',
    }),
  })
  @MaxLength(50, {
    message: JSON.stringify({
      ar: 'اسم العائلة يجب ألا يتجاوز 50 حرفاً',
      en: 'Last name cannot exceed 50 characters',
    }),
  })
  lastName: string;

  @ApiProperty({
    description: 'Employee phone number (must be unique)',
    example: '+966501234567',
    type: String,
    minLength: 10,
    maxLength: 20,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'رقم الهاتف يجب أن يكون نصاً',
      en: 'Phone number must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'رقم الهاتف مطلوب',
      en: 'Phone number is required',
    }),
  })
  @MinLength(10, {
    message: JSON.stringify({
      ar: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل',
      en: 'Phone number must be at least 10 characters long',
    }),
  })
  @MaxLength(20, {
    message: JSON.stringify({
      ar: 'رقم الهاتف يجب ألا يتجاوز 20 رقماً',
      en: 'Phone number cannot exceed 20 characters',
    }),
  })
  phone: string;

  @ApiProperty({
    description: 'Employee role in the organization',
    example: 'doctor',
    enum: ['super_admin', 'owner', 'admin', 'doctor', 'staff', 'patient'],
  })
  @IsEnum(['super_admin', 'owner', 'admin', 'doctor', 'staff', 'patient'], {
    message: JSON.stringify({
      ar: 'الدور غير صالح',
      en: 'Invalid role',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الدور مطلوب',
      en: 'Role is required',
    }),
  })
  role: string;

  @ApiPropertyOptional({
    description: 'Employee nationality',
    example: 'Saudi Arabia',
    type: String,
    maxLength: 50,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الجنسية يجب أن تكون نصاً',
      en: 'Nationality must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(50, {
    message: JSON.stringify({
      ar: 'الجنسية يجب ألا تتجاوز 50 حرفاً',
      en: 'Nationality cannot exceed 50 characters',
    }),
  })
  nationality?: string;

  @ApiProperty({
    description: 'Employee gender',
    example: 'male',
    enum: ['male', 'female', 'other'],
  })
  @IsEnum(['male', 'female', 'other'], {
    message: JSON.stringify({
      ar: 'الجنس غير صالح',
      en: 'Invalid gender',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'الجنس مطلوب',
      en: 'Gender is required',
    }),
  })
  gender: string;

  @ApiProperty({
    description: 'Employee date of birth (must be at least 16 years old)',
    example: '1990-05-15',
    type: String,
    format: 'date',
  })
  @IsDateString(
    {},
    {
      message: JSON.stringify({
        ar: 'تاريخ الميلاد غير صالح',
        en: 'Invalid date of birth',
      }),
    },
  )
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'تاريخ الميلاد مطلوب',
      en: 'Date of birth is required',
    }),
  })
  dateOfBirth: string;

  @ApiPropertyOptional({
    description: 'Employee address',
    example: '123 Medical Street, Riyadh',
    type: String,
    maxLength: 200,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'العنوان يجب أن يكون نصاً',
      en: 'Address must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(200, {
    message: JSON.stringify({
      ar: 'العنوان يجب ألا يتجاوز 200 حرفاً',
      en: 'Address cannot exceed 200 characters',
    }),
  })
  address?: string;

  // Employee Profile Information
  @ApiPropertyOptional({
    description: 'Unique employee number (auto-generated if not provided)',
    example: 'EMP20260001',
    type: String,
    maxLength: 20,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'رقم الموظف يجب أن يكون نصاً',
      en: 'Employee number must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(20, {
    message: JSON.stringify({
      ar: 'رقم الموظف يجب ألا يتجاوز 20 حرفاً',
      en: 'Employee number cannot exceed 20 characters',
    }),
  })
  employeeNumber?: string;

  @ApiPropertyOptional({
    description: 'Employee card number',
    example: 'CARD123456',
    type: String,
    maxLength: 30,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'رقم البطاقة يجب أن يكون نصاً',
      en: 'Card number must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(30, {
    message: JSON.stringify({
      ar: 'رقم البطاقة يجب ألا يتجاوز 30 حرفاً',
      en: 'Card number cannot exceed 30 characters',
    }),
  })
  cardNumber?: string;

  @ApiPropertyOptional({
    description: 'Employee marital status',
    example: 'married',
    enum: ['single', 'married', 'divorced', 'widowed', 'separated', 'other'],
  })
  @IsEnum(['single', 'married', 'divorced', 'widowed', 'separated', 'other'], {
    message: JSON.stringify({
      ar: 'الحالة الاجتماعية غير صالحة',
      en: 'Invalid marital status',
    }),
  })
  @IsOptional()
  maritalStatus?: string;

  @ApiPropertyOptional({
    description: 'Number of children',
    example: 2,
    type: Number,
    minimum: 0,
    maximum: 20,
  })
  @IsNumber(
    {},
    {
      message: JSON.stringify({
        ar: 'عدد الأطفال يجب أن يكون رقماً',
        en: 'Number of children must be a number',
      }),
    }
  )
  @IsOptional()
  @Min(0, {
    message: JSON.stringify({
      ar: 'عدد الأطفال لا يمكن أن يكون أقل من 0',
      en: 'Number of children cannot be less than 0',
    }),
  })
  @Max(20, {
    message: JSON.stringify({
      ar: 'عدد الأطفال لا يمكن أن يتجاوز 20',
      en: 'Number of children cannot exceed 20',
    }),
  })
  numberOfChildren?: number;

  @ApiPropertyOptional({
    description: 'URL to employee profile picture',
    example: 'https://example.com/profiles/john-doe.jpg',
    type: String,
  })
  @IsUrl(
    {},
    {
      message: JSON.stringify({
        ar: 'رابط الصورة غير صالح',
        en: 'Invalid profile picture URL',
      }),
    }
  )
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({
    description: 'Employee job title',
    example: 'Senior Physician',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'المسمى الوظيفي يجب أن يكون نصاً',
      en: 'Job title must be a string',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'المسمى الوظيفي مطلوب',
      en: 'Job title is required',
    }),
  })
  @MinLength(2, {
    message: JSON.stringify({
      ar: 'المسمى الوظيفي يجب أن يكون حرفين على الأقل',
      en: 'Job title must be at least 2 characters long',
    }),
  })
  @MaxLength(100, {
    message: JSON.stringify({
      ar: 'المسمى الوظيفي يجب ألا يتجاوز 100 حرفاً',
      en: 'Job title cannot exceed 100 characters',
    }),
  })
  jobTitle: string;

  @ApiProperty({
    description: 'Date when employee was hired',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString(
    {},
    {
      message: JSON.stringify({
        ar: 'تاريخ التوظيف غير صالح',
        en: 'Invalid date of hiring',
      }),
    },
  )
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'تاريخ التوظيف مطلوب',
      en: 'Date of hiring is required',
    }),
  })
  dateOfHiring: string;

  @ApiPropertyOptional({
    description: 'Employee monthly salary',
    example: 25000,
    type: Number,
    minimum: 0,
  })
  @IsNumber(
    {},
    {
      message: JSON.stringify({
        ar: 'الراتب يجب أن يكون رقماً',
        en: 'Salary must be a number',
      }),
    }
  )
  @IsOptional()
  @Min(0, {
    message: JSON.stringify({
      ar: 'الراتب لا يمكن أن يكون أقل من 0',
      en: 'Salary cannot be less than 0',
    }),
  })
  salary?: number;

  @ApiPropertyOptional({
    description: 'Employee bank account number',
    example: 'SA1234567890123456789012',
    type: String,
    maxLength: 50,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'رقم الحساب البنكي يجب أن يكون نصاً',
      en: 'Bank account must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(50, {
    message: JSON.stringify({
      ar: 'رقم الحساب البنكي يجب ألا يتجاوز 50 حرفاً',
      en: 'Bank account cannot exceed 50 characters',
    }),
  })
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Employee social security number',
    example: 'SSN123456789',
    type: String,
    maxLength: 30,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'رقم التأمينات الاجتماعية يجب أن يكون نصاً',
      en: 'Social security number must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(30, {
    message: JSON.stringify({
      ar: 'رقم التأمينات الاجتماعية يجب ألا يتجاوز 30 حرفاً',
      en: 'Social security number cannot exceed 30 characters',
    }),
  })
  socialSecurityNumber?: string;

  @ApiPropertyOptional({
    description: 'Employee tax ID',
    example: 'TAX987654321',
    type: String,
    maxLength: 30,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الرقم الضريبي يجب أن يكون نصاً',
      en: 'Tax ID must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(30, {
    message: JSON.stringify({
      ar: 'الرقم الضريبي يجب ألا يتجاوز 30 حرفاً',
      en: 'Tax ID cannot exceed 30 characters',
    }),
  })
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the employee',
    example: 'Specialized in cardiology',
    type: String,
    maxLength: 500,
  })
  @IsString({
    message: JSON.stringify({
      ar: 'الملاحظات يجب أن تكون نصاً',
      en: 'Notes must be a string',
    }),
  })
  @IsOptional()
  @MaxLength(500, {
    message: JSON.stringify({
      ar: 'الملاحظات يجب ألا تتجاوز 500 حرفاً',
      en: 'Notes cannot exceed 500 characters',
    }),
  })
  notes?: string;

  // Assignment Information
  @ApiPropertyOptional({
    description: 'Organization ID to assign employee to',
    example: '507f1f77bcf86cd799439030',
    type: String,
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف المنظمة غير صالح',
      en: 'Invalid organization ID',
    }),
  })
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Complex ID to assign employee to',
    example: '507f1f77bcf86cd799439031',
    type: String,
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف المجمع غير صالح',
      en: 'Invalid complex ID',
    }),
  })
  @IsOptional()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Clinic ID to assign employee to',
    example: '507f1f77bcf86cd799439032',
    type: String,
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف العيادة غير صالح',
      en: 'Invalid clinic ID',
    }),
  })
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Array of specialty IDs for medical staff',
    example: ['507f1f77bcf86cd799439040', '507f1f77bcf86cd799439041'],
    type: [String],
  })
  @IsArray({
    message: JSON.stringify({
      ar: 'التخصصات يجب أن تكون مصفوفة',
      en: 'Specialties must be an array',
    }),
  })
  @IsString({ 
    each: true,
    message: JSON.stringify({
      ar: 'كل تخصص يجب أن يكون نصاً',
      en: 'Each specialty must be a string',
    }),
  })
  @IsOptional()
  specialties?: string[];
}

export class UpdateEmployeeDto {
  // User Information Updates
  @ApiPropertyOptional({
    description: 'Employee first name',
    example: 'John',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Employee last name',
    example: 'Doe',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Employee phone number',
    example: '+966501234567',
    type: String,
    minLength: 10,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Employee nationality',
    example: 'Saudi Arabia',
    type: String,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Employee address',
    example: '123 Medical Street, Riyadh',
    type: String,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  // Employee Profile Updates
  @ApiPropertyOptional({
    description: 'Employee card number',
    example: 'CARD123456',
    type: String,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  cardNumber?: string;

  @ApiPropertyOptional({
    description: 'Employee marital status',
    example: 'married',
    enum: ['single', 'married', 'divorced', 'widowed', 'separated', 'other'],
  })
  @IsEnum(['single', 'married', 'divorced', 'widowed', 'separated', 'other'])
  @IsOptional()
  maritalStatus?: string;

  @ApiPropertyOptional({
    description: 'Number of children',
    example: 2,
    type: Number,
    minimum: 0,
    maximum: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  numberOfChildren?: number;

  @ApiPropertyOptional({
    description: 'URL to employee profile picture',
    example: 'https://example.com/profiles/john-doe.jpg',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiPropertyOptional({
    description: 'Employee job title',
    example: 'Chief Physician',
    type: String,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Employee monthly salary',
    example: 30000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({
    description: 'Employee bank account number',
    example: 'SA1234567890123456789012',
    type: String,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Employee social security number',
    example: 'SSN123456789',
    type: String,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  socialSecurityNumber?: string;

  @ApiPropertyOptional({
    description: 'Employee tax ID',
    example: 'TAX987654321',
    type: String,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the employee',
    example: 'Promoted to Chief Physician',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Employee active status',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Array of specialty IDs for medical staff',
    example: ['507f1f77bcf86cd799439040', '507f1f77bcf86cd799439041'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];
}

// Employee Document DTOs
export class CreateEmployeeDocumentDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsEnum([
    'contract',
    'certificate',
    'work_permit',
    'cv',
    'id_copy',
    'diploma',
    'license',
    'insurance',
    'other',
  ])
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
  @IsOptional()
  userId?: string;

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

  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  @IsNotEmpty()
  dayOfWeek: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 08:00)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 17:00)',
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

  @IsEnum(['super_admin', 'owner', 'admin', 'doctor', 'staff', 'patient'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsMongoId()
  @IsOptional()
  organizationId?: string;

  @IsMongoId()
  @IsOptional()
  complexId?: string;

  @IsMongoId()
  @IsOptional()
  clinicId?: string;

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
