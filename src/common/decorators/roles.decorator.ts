import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator to protect routes and methods based on user roles
 *
 * @param roles - Array of allowed roles
 *
 * Usage examples:
 * @Roles(UserRole.OWNER, UserRole.ADMIN)
 * @Roles(UserRole.SUPER_ADMIN)
 * @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
