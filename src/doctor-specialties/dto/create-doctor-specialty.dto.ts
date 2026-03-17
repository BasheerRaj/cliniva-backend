import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateDoctorSpecialtyDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  specialtyId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number = 0;

  @IsOptional()
  @IsString()
  certificationNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateDoctorSpecialtyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  certificationNumber?: string;
}

export class DoctorSpecialtyResponseDto {
  id: string;
  doctorId: string;
  specialtyId: string;
  doctorName?: string;
  clinicName?: string;
  yearsOfExperience: number;
  certificationNumber?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    clinicName?: string;
  };
  specialty?: {
    id: string;
    name: string;
    description?: string;
  };
}

export class ToggleDoctorSpecialtyStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

export class DoctorSpecialtySearchDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  specialtyId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string = '1';

  @IsOptional()
  @IsString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc';
}

export class BulkAssignSpecialtiesDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString({ each: true })
  specialtyIds: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number = 0;
}
