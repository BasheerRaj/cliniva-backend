import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Role Scope Guard
 * 
 * Automatically enforces role-based data access restrictions by modifying
 * query parameters based on the authenticated user's role and assignments.
 * 
 * Security Rules:
 * - Doctors: Can only view their own appointments (auto-sets doctorId)
 * - Staff: Can only view appointments for their assigned clinic (auto-sets clinicId)
 * - Admin/Manager/Owner/Super Admin: Full access without restrictions
 * 
 * This guard prevents privilege escalation by overriding any user-provided
 * filters that would allow access to unauthorized data.
 * 
 * Business Rules: BZR-9b0c1d2e (Doctor restriction), BZR-staff-clinic (Staff restriction)
 */
@Injectable()
export class RoleScopeGuard implements CanActivate {
  private readonly logger = new Logger(RoleScopeGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request - authentication required');
      return false;
    }

    // Apply role-based scope restrictions
    switch (user.role) {
      case UserRole.DOCTOR:
        this.applyDoctorScope(request, user);
        break;

      case UserRole.STAFF:
        this.applyStaffScope(request, user);
        break;

      case UserRole.ADMIN:
        // Admins are scoped to their assigned clinic
        this.applyAdminScope(request, user);
        break;

      case UserRole.MANAGER:
      case UserRole.OWNER:
      case UserRole.SUPER_ADMIN:
        // These roles have full access - no restrictions
        this.logger.debug(
          `User ${user.id} with role ${user.role} has unrestricted access`,
        );
        break;

      default:
        this.logger.warn(
          `Unknown role ${user.role} for user ${user.id} - denying access`,
        );
        return false;
    }

    return true;
  }

  /**
   * Apply doctor scope restriction
   * 
   * Security: Doctors can ONLY view their own appointments
   * Override any doctorId provided in query to prevent privilege escalation
   */
  private applyDoctorScope(request: any, user: any): void {
    const originalDoctorId = request.query.doctorId;

    // Force doctorId to be the logged-in doctor's ID
    request.query.doctorId = user.id;

    if (originalDoctorId && originalDoctorId !== user.id) {
      this.logger.warn(
        `Doctor ${user.id} attempted to access appointments for doctor ${originalDoctorId} - request blocked`,
      );
    }

    this.logger.debug(
      `Applied doctor scope: doctorId=${user.id} for user ${user.id}`,
    );
  }

  /**
   * Apply admin scope restriction
   *
   * Security: Admins can ONLY view data for their assigned clinic
   * Override any clinicId provided in query to prevent cross-clinic access
   */
  private applyAdminScope(request: any, user: any): void {
    if (!user.clinicId) {
      this.logger.warn(
        `Admin user ${user.id} has no assigned clinic - denying access`,
      );
      request.query.clinicId = 'none';
      return;
    }

    const originalClinicId = request.query.clinicId;
    request.query.clinicId = user.clinicId.toString();

    if (originalClinicId && originalClinicId !== user.clinicId.toString()) {
      this.logger.warn(
        `Admin ${user.id} attempted to access data for clinic ${originalClinicId} - request blocked`,
      );
    }

    this.logger.debug(
      `Applied admin scope: clinicId=${user.clinicId} for user ${user.id}`,
    );
  }

  /**
   * Apply staff scope restriction
   *
   * Security: Staff can ONLY view appointments for their assigned clinic
   * Override any clinicId provided in query to prevent privilege escalation
   */
  private applyStaffScope(request: any, user: any): void {
    if (!user.clinicId) {
      this.logger.warn(
        `Staff user ${user.id} has no assigned clinic - denying access`,
      );
      // Staff without clinic assignment cannot view any appointments
      request.query.clinicId = 'none';
      return;
    }

    const originalClinicId = request.query.clinicId;

    // Force clinicId to be the staff's assigned clinic
    request.query.clinicId = user.clinicId.toString();

    if (originalClinicId && originalClinicId !== user.clinicId.toString()) {
      this.logger.warn(
        `Staff ${user.id} attempted to access appointments for clinic ${originalClinicId} - request blocked`,
      );
    }

    this.logger.debug(
      `Applied staff scope: clinicId=${user.clinicId} for user ${user.id}`,
    );
  }
}
