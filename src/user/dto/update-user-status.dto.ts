import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * DTO for updating user status (activate/deactivate)
 *
 * Used for admin-initiated user status changes
 * Business Rule: BZR-n0c4e9f2 - Cannot deactivate own account
 */
export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'User active status (true to activate, false to deactivate)',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActive: boolean;
}
