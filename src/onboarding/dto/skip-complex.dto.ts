import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Skip Complex DTO
 *
 * Data Transfer Object for skipping the complex step in onboarding.
 * Only available for company plan users.
 *
 * BZR-25: Skip complex → skip clinic (company plan only)
 */
export class SkipComplexDto {
  @ApiProperty({
    description: 'User ID requesting to skip complex step',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Subscription ID for the user',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;
}
