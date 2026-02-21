import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsMongoId,
} from 'class-validator';
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

export class UpdateDepartmentStatusDto {
  @ApiProperty({
    description: 'Department status',
    example: 'active',
    enum: ['active', 'inactive'],
    type: String,
  })
  @IsEnum(['active', 'inactive'], {
    message: JSON.stringify({
      ar: 'حالة القسم يجب أن تكون active أو inactive',
      en: 'Department status must be either active or inactive',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'حالة القسم مطلوبة',
      en: 'Department status is required',
    }),
  })
  status: 'active' | 'inactive';
}

export class DeactivateWithTransferDto {
  @ApiProperty({
    description:
      'Target department ID to transfer clinics to (must be active)',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsMongoId({
    message: JSON.stringify({
      ar: 'معرف القسم المستهدف غير صالح',
      en: 'Invalid target department ID',
    }),
  })
  @IsNotEmpty({
    message: JSON.stringify({
      ar: 'معرف القسم المستهدف مطلوب',
      en: 'Target department ID is required',
    }),
  })
  targetDepartmentId: string;
}
