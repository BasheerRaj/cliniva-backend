import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateWithTransferDto {
  @ApiProperty({
    description: 'Whether to transfer appointments',
    example: true,
  })
  @IsBoolean()
  transferAppointments: boolean;

  @ApiProperty({
    description: 'Target doctor ID for appointment transfer',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @ValidateIf((o) => o.transferAppointments === true)
  @IsString()
  targetDoctorId?: string;

  @ApiProperty({
    description: 'Skip transfer and mark appointments for rescheduling',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  skipTransfer?: boolean;
}
