import { PermissionsEnum } from '../enums/permissions.enum';

/**
 * User interface for authentication and authorization
 */
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  groups: string[];
  permissions: PermissionsEnum[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role interface
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionsEnum[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Group interface for organizing users
 */
export interface Group {
  id: string;
  name: string;
  description?: string;
  users: string[]; // User IDs
  roles: string[]; // Role IDs
  permissions: PermissionsEnum[]; // Direct permissions
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
  grantedBy?: 'user' | 'role' | 'group';
}

/**
 * Authorization context
 */
export interface AuthContext {
  user: User;
  requiredPermissions: PermissionsEnum[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

/**
 * Permission metadata for decorators
 */
export interface PermissionMetadata {
  permissions: PermissionsEnum[];
  requireAll?: boolean;
  allowSelf?: boolean; // Allow users to access their own resources
  selfParam?: string; // Parameter name to check for self access (e.g., 'userId')
}
