import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: Partial<ExecutionContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            userId: 'user-123',
            email: 'test@example.com',
            role: UserRole.ADMIN,
          },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when no roles are required', () => {
      // Mock reflector to return no required roles
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should allow access when user has required role (ADMIN)', () => {
      // Mock reflector to return required roles
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      const result = guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
    });

    it('should allow access when user has required role (OWNER)', () => {
      // Mock reflector to return required roles
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Update user role to OWNER
      const contextWithOwner = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.OWNER,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      const result = guard.canActivate(contextWithOwner as ExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', () => {
      // Mock reflector to return required roles
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Mock execution context with no user
      const contextWithoutUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: null,
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      expect(() =>
        guard.canActivate(contextWithoutUser as ExecutionContext),
      ).toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      // Mock reflector to return required roles (OWNER, ADMIN)
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Update user role to DOCTOR (not in required roles)
      const contextWithDoctor = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.DOCTOR,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      expect(() =>
        guard.canActivate(contextWithDoctor as ExecutionContext),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has STAFF role', () => {
      // Mock reflector to return required roles (OWNER, ADMIN)
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Update user role to STAFF (not in required roles)
      const contextWithStaff = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.STAFF,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      expect(() =>
        guard.canActivate(contextWithStaff as ExecutionContext),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has PATIENT role', () => {
      // Mock reflector to return required roles (OWNER, ADMIN)
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Update user role to PATIENT (not in required roles)
      const contextWithPatient = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.PATIENT,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      expect(() =>
        guard.canActivate(contextWithPatient as ExecutionContext),
      ).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN when required', () => {
      // Mock reflector to return required roles including SUPER_ADMIN
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.ADMIN,
        ]);

      // Update user role to SUPER_ADMIN
      const contextWithSuperAdmin = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.SUPER_ADMIN,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      const result = guard.canActivate(
        contextWithSuperAdmin as ExecutionContext,
      );

      expect(result).toBe(true);
    });

    it('should check bilingual error messages', () => {
      // Mock reflector to return required roles
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]);

      // Update user role to DOCTOR (not in required roles)
      const contextWithDoctor = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              userId: 'user-123',
              email: 'test@example.com',
              role: UserRole.DOCTOR,
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      try {
        guard.canActivate(contextWithDoctor as ExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response).toHaveProperty('message');
        expect(error.response.message).toHaveProperty('ar');
        expect(error.response.message).toHaveProperty('en');
        expect(error.response.message.ar).toBe(
          'ليس لديك صلاحية للوصول إلى هذا المورد',
        );
        expect(error.response.message.en).toBe(
          'You do not have permission to access this resource',
        );
        expect(error.response.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });

    it('should handle empty roles array', () => {
      // Mock reflector to return empty roles array
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
    });
  });
});
