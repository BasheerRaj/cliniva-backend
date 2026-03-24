import { IsNotEmpty, IsOptional, IsArray, IsMongoId, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnifiedAvailabilityQueryDto {
  @ApiProperty({
    description: 'Array of Clinic IDs to check availability for',
    example: ['507f1f77bcf86cd799439014'],
  })
  @IsNotEmpty({
    message: '{"ar":"معرفات العيادات مطلوبة","en":"Clinic IDs are required"}',
  })
  @IsArray({
    message: '{"ar":"يجب أن تكون معرفات العيادات مصفوفة","en":"Clinic IDs must be an array"}',
  })
  @IsMongoId({
    each: true,
    message: '{"ar":"معرف عيادة غير صالح","en":"Invalid clinic ID"}',
  })
  clinicIds: string[];

  @ApiPropertyOptional({
    description: 'Array of Doctor IDs to check availability for (optional)',
    example: ['507f1f77bcf86cd799439012'],
  })
  @IsOptional()
  @IsArray({
    message: '{"ar":"يجب أن تكون معرفات الأطباء مصفوفة","en":"Doctor IDs must be an array"}',
  })
  @IsMongoId({
    each: true,
    message: '{"ar":"معرف طبيب غير صالح","en":"Invalid doctor ID"}',
  })
  doctorIds?: string[];

  @ApiProperty({
    description: 'Date for availability check',
    example: '2024-03-15T00:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({
    message: '{"ar":"التاريخ مطلوب","en":"Date is required"}',
  })
  @Type(() => Date)
  @IsDate({
    message: '{"ar":"التاريخ غير صالح","en":"Invalid date"}',
  })
  date: Date;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 30,
    default: 30,
    minimum: 15,
    maximum: 240,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: '{"ar":"المدة يجب أن تكون رقماً","en":"Duration must be a number"}',
    },
  )
  @Min(15, {
    message: '{"ar":"المدة يجب أن تكون 15 دقيقة على الأقل","en":"Duration must be at least 15 minutes"}',
  })
  @Max(240, {
    message: '{"ar":"المدة يجب ألا تتجاوز 240 دقيقة","en":"Duration must not exceed 240 minutes"}',
  })
  duration?: number = 30;
}
