import { IsMongoId, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning a doctor to a service with a custom price
 * PART D
 */
export class CreateDoctorAssignmentDto {
  @ApiProperty({ description: 'Doctor user ID', example: '507f1f77bcf86cd799439015' })
  @IsMongoId()
  doctorId: string;

  @ApiProperty({ description: 'Doctor price for this service', example: 200 })
  @IsNumber()
  @Min(0)
  price: number;
}
