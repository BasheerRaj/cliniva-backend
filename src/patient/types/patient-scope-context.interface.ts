import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Scope context extracted from the authenticated user's JWT payload.
 * Passed to PatientService.getPatients() to enforce complex-level IDOR prevention.
 * UC-3at2c5 (M5 Patients Management)
 */
export interface PatientScopeContext {
  requestingUserId: string;
  role: UserRole;
  /**
   * complexId extracted from JWT (null for super_admin).
   * For super_admin, populated from query.complexId instead.
   * For admin/staff/doctor/manager: always enforced from JWT; query.complexId is ignored.
   */
  complexId: string | null;
  /**
   * clinicId extracted from JWT.
   * Null for roles without clinic scope (admin, owner).
   * Always set for staff, doctor, manager — enforced in query.
   */
  clinicId: string | null;
  clinicIds?: string[] | null;
  organizationId?: string | null;
  subscriptionId?: string | null;
}
