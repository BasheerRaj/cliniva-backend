import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';

export class CreateEmergencyContactDto {
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic', 'patient'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsOptional()
  @IsString()
  relationship?: string; // 'family', 'friend', 'spouse', 'parent', 'sibling', etc.

  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;
}

export class UpdateEmergencyContactDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class EmergencyContactResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  contactName: string;
  contactPhone: string;
  relationship?: string;
  alternativePhone?: string;
  email?: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmergencyContactSearchDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

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

export class BulkEmergencyContactDto {
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic', 'patient'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  contacts: Array<{
    contactName: string;
    contactPhone: string;
    relationship?: string;
    alternativePhone?: string;
    email?: string;
    isPrimary?: boolean;
  }>;
} 