import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Shared DTO for a single phone entry in a phones array.
 * Used across user, employee, and any other schema that supports
 * multiple phone numbers.
 */
export class PhoneDto {
  @ApiPropertyOptional({
    description: 'Phone number in international / E.164 format',
    example: '+966501234567',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({
    description: 'Human-readable label for this number (e.g. Mobile, Work, Home)',
    example: 'Mobile',
    type: String,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the primary contact number',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
