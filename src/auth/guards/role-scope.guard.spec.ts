import { ExecutionContext } from '@nestjs/common';
import { RoleScopeGuard } from './role-scope.guard';
import { UserRole } from '../../common/enums/user-role.enum';

describe('RoleScopeGuard', () => {
  let guard: RoleScopeGuard;

  beforeEach(() => {
    guard = new RoleScopeGuard();
  });

  const createMockContext = (user: any, query: any = {}): ExecutionContext => {
    const mockRequest = {
      user,
      query: { ...query },
    };
    
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  describe('Doctor Role Restrictions', () => {
    it('should enforce doctorId for doctor role', () => {
      const doctorUser = {
        id: 'doctor123',
        role: UserRole.DOCTOR,
      };

      const context = createMockContext(doctorUser, {});
      const result = guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor123');
    });

    it('should override doctorId if doctor tries to access other doctor appointments', () => {
      const doctorUser = {
        id: 'doctor123',
        role: UserRole.DOCTOR,
      };

      const context = createMockContext(doctorUser, {
        doctorId: 'doctor456', // Attempting to access another doctor's appointments
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor123'); // Should be overridden
    });

    it('should preserve other query parameters for doctors', () => {
      const doctorUser = {
        id: 'doctor123',
        role: UserRole.DOCTOR,
      };

      const context = createMockContext(doctorUser, {
        clinicId: 'clinic789',
        status: 'scheduled',
        view: 'week',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor123');
      expect(request.query.clinicId).toBe('clinic789');
      expect(request.query.status).toBe('scheduled');
      expect(request.query.view).toBe('week');
    });
  });

  describe('Staff Role Restrictions', () => {
    it('should enforce clinicId for staff role', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        clinicId: 'clinic456',
      };

      const context = createMockContext(staffUser, {});
      const result = guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic456');
    });

    it('should override clinicId if staff tries to access other clinic appointments', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        clinicId: 'clinic456',
      };

      const context = createMockContext(staffUser, {
        clinicId: 'clinic789', // Attempting to access another clinic's appointments
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic456'); // Should be overridden
    });

    it('should deny access for staff without assigned clinic', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        // No clinicId assigned
      };

      const context = createMockContext(staffUser, {});
      const result = guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(result).toBe(true); // Guard passes but sets impossible filter
      expect(request.query.clinicId).toBe('none'); // Will return no results
    });

    it('should preserve other query parameters for staff', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        clinicId: 'clinic456',
      };

      const context = createMockContext(staffUser, {
        doctorId: 'doctor789',
        status: 'confirmed',
        view: 'day',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic456');
      expect(request.query.doctorId).toBe('doctor789');
      expect(request.query.status).toBe('confirmed');
      expect(request.query.view).toBe('day');
    });
  });

  describe('Unrestricted Roles', () => {
    it('should allow full access for SUPER_ADMIN', () => {
      const adminUser = {
        id: 'admin123',
        role: UserRole.SUPER_ADMIN,
      };

      const context = createMockContext(adminUser, {
        doctorId: 'doctor456',
        clinicId: 'clinic789',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor456'); // Not modified
      expect(request.query.clinicId).toBe('clinic789'); // Not modified
    });

    it('should allow full access for OWNER', () => {
      const ownerUser = {
        id: 'owner123',
        role: UserRole.OWNER,
      };

      const context = createMockContext(ownerUser, {
        doctorId: 'doctor456',
        clinicId: 'clinic789',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor456');
      expect(request.query.clinicId).toBe('clinic789');
    });

    it('should allow full access for ADMIN', () => {
      const adminUser = {
        id: 'admin123',
        role: UserRole.ADMIN,
      };

      const context = createMockContext(adminUser, {
        doctorId: 'doctor456',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor456');
    });

    it('should allow full access for MANAGER', () => {
      const managerUser = {
        id: 'manager123',
        role: UserRole.MANAGER,
      };

      const context = createMockContext(managerUser, {
        clinicId: 'clinic789',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic789');
    });
  });

  describe('Edge Cases', () => {
    it('should deny access when no user in request', () => {
      const context = createMockContext(null, {});
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access for unknown roles', () => {
      const unknownUser = {
        id: 'user123',
        role: 'UNKNOWN_ROLE',
      };

      const context = createMockContext(unknownUser, {});
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle ObjectId clinicId for staff', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        clinicId: { toString: () => 'clinic456' }, // ObjectId-like object
      };

      const context = createMockContext(staffUser, {});
      const result = guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic456');
    });
  });

  describe('Security Tests', () => {
    it('should prevent doctor from viewing all appointments by omitting doctorId', () => {
      const doctorUser = {
        id: 'doctor123',
        role: UserRole.DOCTOR,
      };

      const context = createMockContext(doctorUser, {
        // No doctorId provided - attempting to see all appointments
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor123'); // Automatically added
    });

    it('should prevent staff from viewing all appointments by omitting clinicId', () => {
      const staffUser = {
        id: 'staff123',
        role: UserRole.STAFF,
        clinicId: 'clinic456',
      };

      const context = createMockContext(staffUser, {
        // No clinicId provided - attempting to see all appointments
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.clinicId).toBe('clinic456'); // Automatically added
    });

    it('should prevent privilege escalation via query manipulation', () => {
      const doctorUser = {
        id: 'doctor123',
        role: UserRole.DOCTOR,
      };

      const context = createMockContext(doctorUser, {
        doctorId: 'doctor999', // Malicious attempt
        clinicId: 'clinic999',
      });

      const result = guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.query.doctorId).toBe('doctor123'); // Overridden to logged-in doctor
      expect(request.query.clinicId).toBe('clinic999'); // Preserved (doctors can filter by clinic)
    });
  });
});
