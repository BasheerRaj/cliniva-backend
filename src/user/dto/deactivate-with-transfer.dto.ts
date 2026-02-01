import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * DTO for deactivating a doctor with appointment transfer options
 * 
 * Business Rule: BZR-q0d8a9f1 - Doctor appointment transfer on deactivation
 */
export class DeactivateWithTransferDto {
  @IsBoolean()
  transferAppointments: boolean;

  @ValidateIf((o) => o.transferAppointments === true)
  @IsString()
  targetDoctorId?: string;

  @IsOptional()
  @IsBoolean()
  skipTransfer?: boolean;
}
