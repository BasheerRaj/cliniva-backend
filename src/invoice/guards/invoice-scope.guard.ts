import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Invoice Scope Guard
 * 
 * Automatically enforces role-based data access restrictions for invoices
 * by modifying query parameters based on the authenticated user's role.
 * 
 * Security Rules:
 * - Staff/Doctor: Can only view invoices for their assigned clinic (auto-sets clinicId)
 * - Admin/Manager: View invoices for accessible clinics (uses clinicId if provided)
 * - Owner/Super Admin: Full access without restrictions
 * 
 * This guard prevents privilege escalation by overriding any user-provided
 * filters that would allow access to unauthorized data.
 * 
 * Business Rules: BZR-c5d6e7f8 (Staff clinic restriction)
 */
@Injectable()
export class InvoiceScopeGuard implements CanActivate {
  private readonly logger = new Logger(InvoiceScopeGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request - authentication required');
      return false;
    }

    // Apply role-based scope restrictions
    switch (user.role) {
      case UserRole.STAFF:
      case UserRole.DOCTOR:
        this.applyStaffScope(request, user);
        break;

      case UserRole.ADMIN:
      case UserRole.MANAGER:
        this.applyAdminScope(request, user);
        break;

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
   * Apply staff/doctor scope restriction
   *
   * Security: Staff/Doctor can ONLY view invoices for assigned clinics.
   */
  private applyStaffScope(request: any, user: any): void {
    const allowedClinicIds = this.getAllowedClinicIds(user);
    if (allowedClinicIds.length === 0) {
      this.logger.warn(
        `Staff/Doctor user ${user.id} has no assigned clinics - denying access`,
      );
      request.query.clinicId = 'none';
      return;
    }

    const requestedClinicId =
      typeof request.query.clinicId === 'string' ? request.query.clinicId : undefined;

    if (requestedClinicId) {
      if (!allowedClinicIds.includes(requestedClinicId)) {
        this.logger.warn(
          `Staff/Doctor ${user.id} attempted to access invoices for unauthorized clinic ${requestedClinicId}`,
        );
        request.query.clinicId = 'none';
        return;
      }
      request.query.clinicId = requestedClinicId;
      return;
    }

    if (allowedClinicIds.length === 1) {
      request.query.clinicId = allowedClinicIds[0];
    } else {
      delete request.query.clinicId;
    }

    this.logger.debug(`Applied staff scope for user ${user.id} with clinics=${allowedClinicIds.join(',')}`);
  }

  /**
   * Apply admin/manager scope restriction
   *
   * Admins and Managers are scoped to their assigned clinics.
   */
  private applyAdminScope(request: any, user: any): void {
    const allowedClinicIds = this.getAllowedClinicIds(user);
    if (allowedClinicIds.length === 0) {
      this.logger.warn(
        `Admin/Manager user ${user.id} has no assigned clinics - denying access`,
      );
      request.query.clinicId = 'none';
      return;
    }

    const requestedClinicId =
      typeof request.query.clinicId === 'string' ? request.query.clinicId : undefined;
    if (requestedClinicId) {
      if (!allowedClinicIds.includes(requestedClinicId)) {
        this.logger.warn(
          `Admin/Manager ${user.id} attempted to access invoices for unauthorized clinic ${requestedClinicId}`,
        );
        request.query.clinicId = 'none';
        return;
      }
      request.query.clinicId = requestedClinicId;
      return;
    }

    if (allowedClinicIds.length === 1) {
      request.query.clinicId = allowedClinicIds[0];
    } else {
      delete request.query.clinicId;
    }

    this.logger.debug(`Applied admin scope for user ${user.id} with clinics=${allowedClinicIds.join(',')}`);
  }

  private getAllowedClinicIds(user: any): string[] {
    const clinicIds = Array.isArray(user?.clinicIds)
      ? user.clinicIds.map(String).filter(Boolean)
      : [];
    if (clinicIds.length > 0) {
      return Array.from(new Set(clinicIds));
    }
    return user?.clinicId ? [String(user.clinicId)] : [];
  }
}
