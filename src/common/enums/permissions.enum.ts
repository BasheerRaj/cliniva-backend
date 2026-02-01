/**
 * Permissions enum for role-based access control
 * Defines all possible permissions in the system
 */
export enum PermissionsEnum {
  // User Management CRUD Permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',

  // User Management Extended Permissions
  USER_ACTIVATE = 'user:activate',
  USER_DEACTIVATE = 'user:deactivate',
  USER_RESET_PASSWORD = 'user:reset-password',
  USER_CHANGE_ROLE = 'user:change-role',
  USER_VIEW_PROFILE = 'user:view-profile',
  USER_EDIT_PROFILE = 'user:edit-profile',

  // Group Management Permissions
  GROUP_CREATE = 'group:create',
  GROUP_READ = 'group:read',
  GROUP_UPDATE = 'group:update',
  GROUP_DELETE = 'group:delete',
  GROUP_LIST = 'group:list',
  GROUP_ASSIGN_USERS = 'group:assign-users',
  GROUP_REMOVE_USERS = 'group:remove-users',

  // Role Management Permissions
  ROLE_CREATE = 'role:create',
  ROLE_READ = 'role:read',
  ROLE_UPDATE = 'role:update',
  ROLE_DELETE = 'role:delete',
  ROLE_LIST = 'role:list',
  ROLE_ASSIGN_PERMISSIONS = 'role:assign-permissions',

  // System Administration Permissions
  ADMIN_ACCESS = 'admin:access',
  ADMIN_VIEW_LOGS = 'admin:view-logs',
  ADMIN_MANAGE_SETTINGS = 'admin:manage-settings',
  ADMIN_VIEW_ANALYTICS = 'admin:view-analytics',

  // Database Management Permissions
  DATABASE_READ = 'database:read',
  DATABASE_BACKUP = 'database:backup',
  DATABASE_RESTORE = 'database:restore',
  DATABASE_HEALTH_CHECK = 'database:health-check',
}

/**
 * Permission groups for easier management
 * These represent common permission combinations
 */
export const PermissionGroups = {
  USER_FULL_ACCESS: [
    PermissionsEnum.USER_CREATE,
    PermissionsEnum.USER_READ,
    PermissionsEnum.USER_UPDATE,
    PermissionsEnum.USER_DELETE,
    PermissionsEnum.USER_LIST,
    PermissionsEnum.USER_ACTIVATE,
    PermissionsEnum.USER_DEACTIVATE,
    PermissionsEnum.USER_RESET_PASSWORD,
    PermissionsEnum.USER_CHANGE_ROLE,
  ],

  USER_READ_ONLY: [
    PermissionsEnum.USER_READ,
    PermissionsEnum.USER_LIST,
    PermissionsEnum.USER_VIEW_PROFILE,
  ],

  USER_MANAGEMENT: [
    PermissionsEnum.USER_CREATE,
    PermissionsEnum.USER_READ,
    PermissionsEnum.USER_UPDATE,
    PermissionsEnum.USER_LIST,
    PermissionsEnum.USER_ACTIVATE,
    PermissionsEnum.USER_DEACTIVATE,
  ],

  GROUP_FULL_ACCESS: [
    PermissionsEnum.GROUP_CREATE,
    PermissionsEnum.GROUP_READ,
    PermissionsEnum.GROUP_UPDATE,
    PermissionsEnum.GROUP_DELETE,
    PermissionsEnum.GROUP_LIST,
    PermissionsEnum.GROUP_ASSIGN_USERS,
    PermissionsEnum.GROUP_REMOVE_USERS,
  ],

  ROLE_FULL_ACCESS: [
    PermissionsEnum.ROLE_CREATE,
    PermissionsEnum.ROLE_READ,
    PermissionsEnum.ROLE_UPDATE,
    PermissionsEnum.ROLE_DELETE,
    PermissionsEnum.ROLE_LIST,
    PermissionsEnum.ROLE_ASSIGN_PERMISSIONS,
  ],

  ADMIN_PERMISSIONS: [
    PermissionsEnum.ADMIN_ACCESS,
    PermissionsEnum.ADMIN_VIEW_LOGS,
    PermissionsEnum.ADMIN_MANAGE_SETTINGS,
    PermissionsEnum.ADMIN_VIEW_ANALYTICS,
    PermissionsEnum.DATABASE_READ,
    PermissionsEnum.DATABASE_HEALTH_CHECK,
  ],

  SUPER_ADMIN: Object.values(PermissionsEnum),
} as const;

/**
 * Default role-permission mappings
 */
export const DefaultRolePermissions = {
  SUPER_ADMIN: PermissionGroups.SUPER_ADMIN,
  OWNER: [
    ...PermissionGroups.USER_FULL_ACCESS,
    ...PermissionGroups.GROUP_FULL_ACCESS,
    ...PermissionGroups.ROLE_FULL_ACCESS,
    ...PermissionGroups.ADMIN_PERMISSIONS,
  ],
  ADMIN: [
    ...PermissionGroups.USER_FULL_ACCESS,
    ...PermissionGroups.GROUP_FULL_ACCESS,
    ...PermissionGroups.ADMIN_PERMISSIONS,
  ],
  DOCTOR: [
    PermissionsEnum.USER_READ,
    PermissionsEnum.USER_UPDATE,
    PermissionsEnum.USER_VIEW_PROFILE,
    PermissionsEnum.USER_EDIT_PROFILE,
    PermissionsEnum.ADMIN_VIEW_ANALYTICS,
  ],
  STAFF: [
    PermissionsEnum.USER_READ,
    PermissionsEnum.USER_VIEW_PROFILE,
    PermissionsEnum.USER_EDIT_PROFILE,
  ],
  PATIENT: [
    PermissionsEnum.USER_VIEW_PROFILE,
    PermissionsEnum.USER_EDIT_PROFILE,
  ],
} as const;
