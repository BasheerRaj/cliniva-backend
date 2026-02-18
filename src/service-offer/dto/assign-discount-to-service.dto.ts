import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDiscountToServiceDto {
  @ApiProperty({
    description: 'Offer ID to assign to the service',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  offerId: string;

  @ApiPropertyOptional({
    description: 'Whether the discount assignment is active',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
