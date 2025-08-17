import { SetMetadata } from '@nestjs/common';
import { PermissionsEnum } from '../enums/permissions.enum';
import { PermissionMetadata } from '../types/permission.types';

/**
 * Metadata key for permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions decorator to protect routes and methods
 * 
 * @param permissions - Array of required permissions
 * @param options - Additional options for permission checking
 * 
 * Usage examples:
 * @Permissions([PermissionsEnum.USER_READ])
 * @Permissions([PermissionsEnum.USER_CREATE, PermissionsEnum.USER_UPDATE], { requireAll: true })
 * @Permissions([PermissionsEnum.USER_UPDATE], { allowSelf: true, selfParam: 'userId' })
 */
export const Permissions = (
  permissions: PermissionsEnum[],
  options: Partial<Omit<PermissionMetadata, 'permissions'>> = {}
) => {
  const metadata: PermissionMetadata = {
    permissions,
    requireAll: options.requireAll ?? false,
    allowSelf: options.allowSelf ?? false,
    selfParam: options.selfParam ?? 'id',
  };
  
  return SetMetadata(PERMISSIONS_KEY, metadata);
};

/**
 * Shorthand decorators for common permission patterns
 */

/**
 * Requires ANY of the specified permissions
 */
export const RequireAnyPermission = (...permissions: PermissionsEnum[]) =>
  Permissions(permissions, { requireAll: false });

/**
 * Requires ALL of the specified permissions
 */
export const RequireAllPermissions = (...permissions: PermissionsEnum[]) =>
  Permissions(permissions, { requireAll: true });

/**
 * User management specific decorators
 */
export const CanCreateUser = () => Permissions([PermissionsEnum.USER_CREATE]);
export const CanReadUser = () => Permissions([PermissionsEnum.USER_READ]);
export const CanUpdateUser = () => Permissions([PermissionsEnum.USER_UPDATE]);
export const CanDeleteUser = () => Permissions([PermissionsEnum.USER_DELETE]);
export const CanListUsers = () => Permissions([PermissionsEnum.USER_LIST]);

/**
 * User management with self-access
 */
export const CanReadUserOrSelf = (selfParam = 'userId') =>
  Permissions([PermissionsEnum.USER_READ], { allowSelf: true, selfParam });

export const CanUpdateUserOrSelf = (selfParam = 'userId') =>
  Permissions([PermissionsEnum.USER_UPDATE], { allowSelf: true, selfParam });

/**
 * Group management decorators
 */
export const CanCreateGroup = () => Permissions([PermissionsEnum.GROUP_CREATE]);
export const CanReadGroup = () => Permissions([PermissionsEnum.GROUP_READ]);
export const CanUpdateGroup = () => Permissions([PermissionsEnum.GROUP_UPDATE]);
export const CanDeleteGroup = () => Permissions([PermissionsEnum.GROUP_DELETE]);
export const CanListGroups = () => Permissions([PermissionsEnum.GROUP_LIST]);

/**
 * Role management decorators
 */
export const CanCreateRole = () => Permissions([PermissionsEnum.ROLE_CREATE]);
export const CanReadRole = () => Permissions([PermissionsEnum.ROLE_READ]);
export const CanUpdateRole = () => Permissions([PermissionsEnum.ROLE_UPDATE]);
export const CanDeleteRole = () => Permissions([PermissionsEnum.ROLE_DELETE]);
export const CanListRoles = () => Permissions([PermissionsEnum.ROLE_LIST]);

/**
 * Admin decorators
 */
export const RequireAdminAccess = () => Permissions([PermissionsEnum.ADMIN_ACCESS]);
export const CanViewLogs = () => Permissions([PermissionsEnum.ADMIN_VIEW_LOGS]);
export const CanManageSettings = () => Permissions([PermissionsEnum.ADMIN_MANAGE_SETTINGS]);
export const CanViewAnalytics = () => Permissions([PermissionsEnum.ADMIN_VIEW_ANALYTICS]);

/**
 * Database management decorators
 */
export const CanReadDatabase = () => Permissions([PermissionsEnum.DATABASE_READ]);
export const CanBackupDatabase = () => Permissions([PermissionsEnum.DATABASE_BACKUP]);
export const CanRestoreDatabase = () => Permissions([PermissionsEnum.DATABASE_RESTORE]);
export const CanCheckDatabaseHealth = () => Permissions([PermissionsEnum.DATABASE_HEALTH_CHECK]);
