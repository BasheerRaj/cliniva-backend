import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleSpecialtyStatusDto {
  @ApiProperty({
    description: 'Whether the specialty should be active or inactive',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Reason for deactivation (recommended when deactivating)',
    example: 'Specialty no longer offered at this facility',
    type: String,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
