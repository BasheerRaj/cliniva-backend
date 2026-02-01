import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class CreateDynamicInfoDto {
  @IsString()
  @IsEnum(['organization', 'complex', 'clinic'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  infoType: string; // 'privacy_policy', 'terms_conditions', 'certifications', 'awards', etc.

  @IsString()
  @IsOptional()
  infoValue?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateDynamicInfoDto {
  @IsString()
  @IsOptional()
  infoValue?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DynamicInfoResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  infoType: string;
  infoValue?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InfoTypeDto {
  type: string;
  description: string;
  category: string;
}

export class DynamicInfoSearchDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  infoType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
