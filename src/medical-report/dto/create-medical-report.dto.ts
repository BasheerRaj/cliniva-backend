import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsBoolean,
  IsMongoId,
  Length,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateMedicalReportDto {
  @IsMongoId()
  @IsNotEmpty()
  appointmentId: string;

  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  diagnosis?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  symptoms?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  treatmentPlan?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1500)
  medications?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  followUpInstructions?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  nextAppointmentRecommended?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVisibleToPatient?: boolean;
}

export class UpdateMedicalReportDto {
  @IsString()
  @IsOptional()
  @Length(0, 2000)
  diagnosis?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  symptoms?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  treatmentPlan?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1500)
  medications?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  followUpInstructions?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  nextAppointmentRecommended?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVisibleToPatient?: boolean;
}

export class MedicalReportSearchQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search across diagnosis, symptoms, treatment

  @IsMongoId()
  @IsOptional()
  appointmentId?: string;

  @IsMongoId()
  @IsOptional()
  patientId?: string;

  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  nextAppointmentRecommended?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVisibleToPatient?: boolean;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

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

export class ShareMedicalReportDto {
  @IsArray()
  @IsMongoId({ each: true })
  shareWithUserIds: string[]; // Users to share the report with

  @IsString()
  @IsOptional()
  @Length(0, 500)
  shareMessage?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  shareWithPatient?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sendNotification?: boolean;
}

export class MedicalReportTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  templateName: string;

  @IsString()
  @IsOptional()
  @Length(0, 300)
  description?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  diagnosisTemplate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  symptomsTemplate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  treatmentPlanTemplate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1500)
  medicationsTemplate?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  followUpInstructionsTemplate?: string;

  @IsEnum(['general', 'cardiology', 'dermatology', 'pediatrics', 'orthopedics', 'neurology', 'other'])
  @IsOptional()
  specialty?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

export class BulkCreateMedicalReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMedicalReportDto)
  reports: CreateMedicalReportDto[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  skipValidationErrors?: boolean; // Skip reports with validation errors

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  autoShareWithPatient?: boolean;
}

export class MedicalReportStatsDto {
  totalReports: number;
  reportsThisMonth: number;
  reportsThisWeek: number;
  reportsToday: number;
  averageReportsPerDay: number;
  reportsWithFollowUp: number;
  reportsSharedWithPatients: number;
  topDiagnoses: Array<{
    diagnosis: string;
    count: number;
    percentage: number;
  }>;
  topDoctors: Array<{
    doctorId: string;
    doctorName: string;
    reportCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
  }>;
  followUpRecommendationRate: number;
  patientVisibilityRate: number;
}

export class MedicalReportResponseDto {
  _id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdBy: string;
  updatedBy?: string;
  diagnosis?: string;
  symptoms?: string;
  treatmentPlan?: string;
  medications?: string;
  followUpInstructions?: string;
  nextAppointmentRecommended: boolean;
  isVisibleToPatient: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Populated fields (optional)
  appointment?: {
    _id: string;
    appointmentDate: Date;
    appointmentTime: string;
    status: string;
    service?: {
      _id: string;
      name: string;
    };
  };
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    phone: string;
    email: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  creator?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export class MedicalReportSummaryDto {
  reportId: string;
  appointmentDate: Date;
  doctorName: string;
  diagnosis: string;
  hasFollowUp: boolean;
  isSharedWithPatient: boolean;
  createdAt: Date;
  version: number;
}

export class PatientMedicalHistoryDto {
  patientId: string;
  patientName: string;
  totalReports: number;
  latestReport?: MedicalReportSummaryDto;
  commonDiagnoses: string[];
  currentMedications: string[];
  pendingFollowUps: number;
  reports: MedicalReportSummaryDto[];
}

export class DoctorReportStatsDto {
  doctorId: string;
  doctorName: string;
  totalReports: number;
  reportsThisMonth: number;
  avgReportsPerWeek: number;
  followUpRecommendationRate: number;
  patientShareRate: number;
  topDiagnoses: Array<{
    diagnosis: string;
    count: number;
  }>;
  recentReports: MedicalReportSummaryDto[];
}

export class MedicalReportVersionDto {
  version: number;
  createdAt: Date;
  updatedBy: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

export class GenerateMedicalReportPdfDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePatientInfo?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDoctorInfo?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAppointmentDetails?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSignature?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  additionalNotes?: string;
}

export class MedicalReportFilterDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  diagnoses?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  doctorIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFollowUp?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSharedWithPatient?: boolean;

  @IsString()
  @IsOptional()
  dateRange?: string; // 'today', 'week', 'month', 'quarter', 'year'
} 