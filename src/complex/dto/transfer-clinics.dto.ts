import { IsNotEmpty, IsString, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for transferring clinics between complexes
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class TransferClinicsDto {
  @ApiProperty({
    description:
      'Target complex ID to transfer clinics to. Must be active and have capacity.',
    example: '507f1f77bcf86cd799439020',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  targetComplexId: string;

  @ApiProperty({
    description:
      'Array of clinic IDs to transfer. All clinics must belong to the source complex.',
    example: ['507f1f77bcf86cd799439021', '507f1f77bcf86cd799439022'],
    type: [String],
    isArray: true,
    minItems: 1,
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  clinicIds: string[];
}
