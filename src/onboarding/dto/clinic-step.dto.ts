import { 
  IsString, IsOptional, IsNumber, IsUrl, IsBoolean, IsArray, ValidateNested, IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactInfoDto, LegalInfoDto } from './shared-base.dto';
import { InheritanceSettingsDto } from './step-progress.dto';

export class ClinicCapacityDto {
  @ApiPropertyOptional({ example: 20, description: 'Maximum staff capacity' })
  @IsNumber()
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum doctors capacity' })
  @IsNumber()
  @IsOptional()
  maxDoctors?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum patients capacity' })
  @IsNumber()
  @IsOptional()
  maxPatients?: number;

  @ApiPropertyOptional({ example: 30, description: 'Default session duration in minutes' })
  @IsNumber()
  @IsOptional()
  sessionDuration?: number;
}

export class ClinicServiceDto {
  @ApiProperty({ example: 'General Checkup', description: 'Service name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Basic health check', description: 'Service description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 30, description: 'Service duration in minutes' })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 50, description: 'Service price' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 'dep123', description: 'Department ID this service belongs to' })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;
}

export class ClinicOverviewDto {
  @ApiProperty({ example: 'Healthy Clinic', description: 'Clinic name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Dr. John Doe', description: 'Head doctor name' })
  @IsString()
  @IsOptional()
  headDoctorName?: string;

  @ApiPropertyOptional({ example: 'Cardiology', description: 'Clinic specialization' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({ example: 'LIC12345', description: 'Clinic license number' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'PIN123', description: 'Clinic PIN/identifier' })
  @IsString()
  @IsOptional()
  pin?: string;

  @ApiPropertyOptional({ example: 'https://cliniclogo.com/logo.png', description: 'Logo URL' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://clinicwebsite.com', description: 'Website URL' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'dep123', description: 'Complex department ID' })
  @IsString()
  @IsOptional()
  complexDepartmentId?: string;

  @ApiPropertyOptional({ example: 2000, description: 'Year the clinic was established' })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({ example: 'To provide the best healthcare', description: 'Clinic mission' })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({ example: 'To be a leading clinic in the region', description: 'Clinic vision' })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({ example: 'We offer a range of health services', description: 'Clinic overview' })
  @IsString()
  @IsOptional()
  overview?: string;

  @ApiPropertyOptional({ example: 'Improve community health', description: 'Clinic goals' })
  @IsString()
  @IsOptional()
  goals?: string;

  @ApiPropertyOptional({ example: 'Dr. Jane Smith', description: 'CEO or clinic director name' })
  @IsString()
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({ type: [ClinicServiceDto], description: 'Services offered by this clinic' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicServiceDto)
  @IsOptional()
  services?: ClinicServiceDto[];

  @ApiPropertyOptional({ type: InheritanceSettingsDto, description: 'Data inheritance settings' })
  @ValidateNested()
  @Type(() => InheritanceSettingsDto)
  @IsOptional()
  inheritanceSettings?: InheritanceSettingsDto;
}

export class ClinicContactDto extends ContactInfoDto {
  // Inherits all fields, Swagger يظهرهم تلقائياً
}

export class ClinicWorkingHoursDto {
  @ApiProperty({ enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], description: 'Day of the week' })
  @IsString()
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

  @ApiProperty({ example: true, description: 'Is this a working day?' })
  @IsBoolean()
  isWorkingDay: boolean;

  @ApiPropertyOptional({ example: '08:00', description: 'Opening time HH:mm' })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Closing time HH:mm' })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Break start time HH:mm' })
  @IsString()
  @IsOptional()
  breakStartTime?: string;

  @ApiPropertyOptional({ example: '13:00', description: 'Break end time HH:mm' })
  @IsString()
  @IsOptional()
  breakEndTime?: string;

  @ApiPropertyOptional({ example: '08:00', description: 'Complex opening time for reference' })
  @IsString()
  @IsOptional()
  complexOpeningTime?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Complex closing time for reference' })
  @IsString()
  @IsOptional()
  complexClosingTime?: string;
}

export class ClinicBusinessProfileDto {
  @ApiPropertyOptional({ example: 2000, description: 'Year established' })
  @IsNumber()
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({ example: 'Provide best healthcare', description: 'Clinic mission' })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiPropertyOptional({ example: 'Be leading clinic in region', description: 'Clinic vision' })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiPropertyOptional({ example: 'Dr. John Doe', description: 'Head doctor name' })
  @IsString()
  @IsOptional()
  headDoctorName?: string;
}

export class ClinicLegalInfoDto extends LegalInfoDto {
  // Inherits all legal fields, Swagger يظهرها تلقائيًا
}

export class ClinicStepDto {
  @ApiProperty({ type: ClinicOverviewDto, description: 'Clinic overview information' })
  @ValidateNested()
  @Type(() => ClinicOverviewDto)
  overview: ClinicOverviewDto;

  @ApiPropertyOptional({ type: ClinicContactDto, description: 'Clinic contact information' })
  @ValidateNested()
  @Type(() => ClinicContactDto)
  @IsOptional()
  contact?: ClinicContactDto;

  @ApiPropertyOptional({ type: ClinicBusinessProfileDto, description: 'Clinic business profile' })
  @ValidateNested()
  @Type(() => ClinicBusinessProfileDto)
  @IsOptional()
  businessProfile?: ClinicBusinessProfileDto;

  @ApiPropertyOptional({ type: ClinicLegalInfoDto, description: 'Clinic legal information' })
  @ValidateNested()
  @Type(() => ClinicLegalInfoDto)
  @IsOptional()
  legalInfo?: ClinicLegalInfoDto;

  @ApiPropertyOptional({ type: [ClinicWorkingHoursDto], description: 'Clinic working hours' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicWorkingHoursDto)
  @IsOptional()
  workingHours?: ClinicWorkingHoursDto[];

  @ApiPropertyOptional({ example: true, description: 'Skip to next step' })
  @IsBoolean()
  @IsOptional()
  skipToNext?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Finalize clinic setup' })
  @IsBoolean()
  @IsOptional()
  completeSetup?: boolean;
}
