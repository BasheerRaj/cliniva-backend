import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';

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
