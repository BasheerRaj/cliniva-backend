import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class SpecialtyDropdownQueryDto {
  @ApiPropertyOptional({
    description: 'Filter specialties by complex ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Search specialties by name',
    example: 'cardio',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include inactive specialties in dropdown results',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeInactive?: boolean;
}
