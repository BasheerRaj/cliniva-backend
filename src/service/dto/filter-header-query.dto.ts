import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterHeaderQueryDto {
  @ApiProperty({
    description: 'Comma-separated service IDs to filter clinics and doctors',
    example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  serviceIds: string;
}
