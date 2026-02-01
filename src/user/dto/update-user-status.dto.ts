import { IsBoolean } from 'class-validator';

/**
 * DTO for updating user status (activate/deactivate)
 * 
 * Used for admin-initiated user status changes
 * Business Rule: BZR-n0c4e9f2 - Cannot deactivate own account
 */
export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}
