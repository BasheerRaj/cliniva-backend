import {
  IsOptional,
  IsString,
  IsBoolean,
  IsMongoId,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialtySearchDto {
  @ApiPropertyOptional({
    description: 'Search in name and description',
    example: 'cardio',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by complex ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsMongoId()
  @IsOptional()
  complexId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: '1',
    default: '1',
  })
  @IsString()
  @IsOptional()
  page?: string = '1';

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: '10',
    default: '10',
  })
  @IsString()
  @IsOptional()
  limit?: string = '10';

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'updatedAt', 'assignedDoctorsCount'],
    default: 'name',
  })
  @IsString()
  @IsOptional()
  @IsIn(['name', 'updatedAt', 'assignedDoctorsCount'])
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'asc';
}
