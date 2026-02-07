import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for filtering clinics by complex
 *
 * Business Rule: BZR-g3e5c9a0 - Complex-based clinic filtering
 */
export class ClinicFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
    type: String,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
    type: String,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
