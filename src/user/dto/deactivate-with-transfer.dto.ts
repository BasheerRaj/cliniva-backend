import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * DTO for deactivating a doctor with appointment transfer options
 *
 * Business Rule: BZR-q0d8a9f1 - Doctor appointment transfer on deactivation
 */
export class DeactivateWithTransferDto {
  @ApiProperty({
    description: 'Whether to transfer appointments to another doctor',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  transferAppointments: boolean;

  @ApiPropertyOptional({
    description:
      'Target doctor ID to transfer appointments to (required if transferAppointments is true)',
    example: '507f1f77bcf86cd799439016',
    type: String,
  })
  @ValidateIf((o) => o.transferAppointments === true)
  @IsString()
  targetDoctorId?: string;

  @ApiPropertyOptional({
    description: 'Skip appointment transfer and mark them for rescheduling',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  skipTransfer?: boolean;
}
