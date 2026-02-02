import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

enum ComplexStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export class UpdateComplexStatusDto {
  @IsNotEmpty()
  @IsEnum(ComplexStatus)
  status: ComplexStatus;

  @ValidateIf((o) => o.status === 'inactive' || o.status === 'suspended')
  @IsOptional()
  @IsString()
  targetComplexId?: string;

  @IsOptional()
  @IsString()
  deactivationReason?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  transferClinics?: boolean = false;
}
