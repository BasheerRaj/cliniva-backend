import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name (must be unique across the system)',
    example: 'Cardiology',
    type: String,
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description:
      'Department description providing details about the medical specialty',
    example: 'Heart and cardiovascular system department',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description:
      'Department name (must be unique across the system if changed)',
    example: 'Cardiology',
    type: String,
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Department description providing details about the medical specialty',
    example: 'Heart and cardiovascular system department',
    type: String,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignDepartmentsDto {
  @ApiProperty({
    description: 'Array of department IDs to assign to the complex',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  departmentIds: string[];
}
