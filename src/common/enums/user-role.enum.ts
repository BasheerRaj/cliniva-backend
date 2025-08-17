/**
 * User roles enum for the Cliniva system
 * Defines all possible user roles in the system
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  STAFF = 'staff',
  PATIENT = 'patient',
}

/**
 * Role hierarchy - defines which roles have access to manage other roles
 */
export const RoleHierarchy: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.OWNER]: [
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.ADMIN]: [
    UserRole.DOCTOR,
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.DOCTOR]: [
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.STAFF]: [
    UserRole.PATIENT,
  ],
  [UserRole.PATIENT]: [],
};

/**
 * Role display names for UI
 */
export const RoleDisplayNames = {
  [UserRole.SUPER_ADMIN]: 'Super Administrator',
  [UserRole.OWNER]: 'Owner',
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.DOCTOR]: 'Doctor',
  [UserRole.STAFF]: 'Staff',
  [UserRole.PATIENT]: 'Patient',
} as const;

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return RoleHierarchy[managerRole]?.includes(targetRole) ?? false;
}

/**
 * Get all roles that a given role can manage
 */
export function getManageableRoles(role: UserRole): UserRole[] {
  return [...RoleHierarchy[role]];
}
