import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateServicePriceDto {
  @ApiPropertyOptional({
    description:
      'Base price to calculate discount from. If not provided, uses service price',
    example: 150,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  basePrice?: number;

  @ApiProperty({
    description: 'Appointment date to check discount validity',
    example: '2026-06-15T10:00:00.000Z',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsDateString()
  appointmentDate: string;
}


