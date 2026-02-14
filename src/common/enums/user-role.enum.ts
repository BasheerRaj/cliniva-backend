/**
 * User roles enum for the Cliniva system
 * Defines all possible user roles in the system
 *
 * Role hierarchy for user creation:
 * - No one can create a super_admin (only seeded)
 * - Only owner or super_admin can create an admin
 * - Owner can create admin for their organization/complex/clinic (based on plan)
 * - Admin can create manager, doctor, staff, patient (associated to same scope)
 * - Owner/patient can self-register (no auth required)
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  DOCTOR = 'doctor',
  STAFF = 'staff',
  PATIENT = 'patient',
}

/**
 * Role hierarchy - defines which roles can CREATE other roles
 *
 * IMPORTANT: super_admin is NOT in any list - no one can create a super_admin.
 * super_admin can create: owner, admin, manager, doctor, staff, patient
 * owner can create: admin, manager, doctor, staff, patient
 * admin can create: manager, doctor, staff, patient
 * manager can create: doctor, staff, patient
 * doctor can create: patient (e.g., register walk-in patients)
 * staff can create: patient
 * patient can create: nothing
 */
export const RoleHierarchy: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.DOCTOR,
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.OWNER]: [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.DOCTOR,
    UserRole.STAFF,
    UserRole.PATIENT,
  ],
  [UserRole.ADMIN]: [UserRole.MANAGER, UserRole.DOCTOR, UserRole.STAFF, UserRole.PATIENT],
  [UserRole.MANAGER]: [UserRole.DOCTOR, UserRole.STAFF, UserRole.PATIENT],
  [UserRole.DOCTOR]: [UserRole.PATIENT],
  [UserRole.STAFF]: [UserRole.PATIENT],
  [UserRole.PATIENT]: [],
};

/**
 * Roles that require authentication to create (cannot self-register)
 * These roles must be created by an authorized user
 */
export const ROLES_REQUIRING_AUTH_TO_CREATE: UserRole[] = [
  UserRole.SUPER_ADMIN, // Cannot be created at all
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DOCTOR,
  UserRole.STAFF,
];

/**
 * Roles that can self-register without authentication
 */
export const SELF_REGISTERABLE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.PATIENT,
];

/**
 * Role display names for UI
 */
export const RoleDisplayNames = {
  [UserRole.SUPER_ADMIN]: 'Super Administrator',
  [UserRole.OWNER]: 'Owner',
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.DOCTOR]: 'Doctor',
  [UserRole.STAFF]: 'Staff',
  [UserRole.PATIENT]: 'Patient',
} as const;

/**
 * Check if a role can manage another role
 */
export function canManageRole(
  managerRole: UserRole,
  targetRole: UserRole,
): boolean {
  return RoleHierarchy[managerRole]?.includes(targetRole) ?? false;
}

/**
 * Get all roles that a given role can manage
 */
export function getManageableRoles(role: UserRole): UserRole[] {
  return [...RoleHierarchy[role]];
}
