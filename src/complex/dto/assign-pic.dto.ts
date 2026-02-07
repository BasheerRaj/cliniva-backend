import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning person-in-charge to a complex
 * Subtask 1.3.11: Update all complex DTOs with @ApiProperty decorators
 */
export class AssignPICDto {
  @ApiProperty({
    description:
      'User ID of the person to assign as person-in-charge. Must be an employee of the complex (not a patient).',
    example: '507f1f77bcf86cd799439014',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
