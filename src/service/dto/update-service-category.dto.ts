import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateServiceCategoryDto {
  @ApiProperty({
    description: 'Service category label',
    example: 'Consultation',
    maxLength: 100,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serviceCategory: string;
}
