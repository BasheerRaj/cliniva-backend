import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

/**
 * DTO for transferring appointments from one doctor to another
 * Task 10.3: Create appointment transfer endpoint
 * Requirements: 7.2, 7.3, 7.4, 7.6
 */
export class TransferAppointmentsDto {
  @ApiProperty({
    description: 'Target doctor ID to transfer appointments to',
    example: '507f1f77bcf86cd799439016',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  targetDoctorId: string;

  @ApiProperty({
    description: 'Array of appointment IDs to transfer',
    example: [
      '507f1f77bcf86cd799439020',
      '507f1f77bcf86cd799439021',
      '507f1f77bcf86cd799439022',
    ],
    type: [String],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  appointmentIds: string[];
}
