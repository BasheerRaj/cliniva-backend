import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum ComplexStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for listing complexes with pagination and filters
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class ListComplexesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    type: Number,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by subscription ID',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by complex status',
    enum: ComplexStatus,
    example: ComplexStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ComplexStatus)
  status?: ComplexStatus;

  @ApiPropertyOptional({
    description: 'Search by complex name (case-insensitive)',
    example: 'Medical Center',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    type: String,
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description:
      'Include calculated counts (appointments, clinics, capacity). Note: This may impact performance for large datasets.',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeCounts?: boolean = false;
}
