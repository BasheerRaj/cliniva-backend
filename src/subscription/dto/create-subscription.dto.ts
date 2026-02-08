import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'User ID who will own this subscription',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Subscription plan ID',
    example: '507f1f77bcf86cd799439013',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Type of subscription plan',
    enum: ['company', 'complex', 'clinic'],
    example: 'complex',
  })
  @IsString()
  @IsEnum(['company', 'complex', 'clinic'])
  planType: string;

  @ApiPropertyOptional({
    description: 'Subscription status',
    enum: ['active', 'inactive', 'cancelled'],
    example: 'active',
    default: 'active',
  })
  @IsString()
  @IsEnum(['active', 'inactive', 'cancelled'])
  @IsOptional()
  status?: string = 'active';

  @ApiPropertyOptional({
    description: 'Subscription expiration date (ISO 8601 format)',
    example: '2027-02-07T10:00:00.000Z',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateSubscriptionStatusDto {
  @ApiProperty({
    description: 'New subscription status',
    enum: ['active', 'inactive', 'cancelled'],
    example: 'cancelled',
  })
  @IsString()
  @IsEnum(['active', 'inactive', 'cancelled'])
  status: string;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'User requested cancellation',
    type: String,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
