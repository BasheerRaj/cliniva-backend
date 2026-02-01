import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RateLimitGuard } from '../../../src/auth/guards/rate-limit.guard';
import { RateLimitService } from '../../../src/auth/rate-limit.service';
import { AuditService } from '../../../src/auth/audit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitType,
  RateLimitConfig,
} from '../../../src/common/decorators/rate-limit.decorator';
import { AuthErrorCode } from '../../../src/common/enums/auth-error-code.enum';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let rateLimitService: RateLimitService;
  let auditService: AuditService;
  let mockExecutionContext: Partial<ExecutionContext>;

  const mockRateLimitService = {
    checkPasswordResetLimit: jest.fn(),
    checkLoginAttemptLimit: jest.fn(),
    checkPasswordChangeLimit: jest.fn(),
  };

  const mockAuditService = {
    logRateLimitViolation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    auditService = module.get<AuditService>(AuditService);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          ip: '192.168.1.1',
          url: '/auth/forgot-password',
          user: {
            userId: 'user-123',
            email: 'test@example.com',
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

    it('should allow request when no rate limit is configured', async () => {
      // Mock reflector to return null (no rate limit config)
      jest.spyOn(reflector, 'get').mockReturnValue(null);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith(
        RATE_LIMIT_KEY,
        mockExecutionContext.getHandler(),
      );
      expect(
        mockRateLimitService.checkPasswordResetLimit,
      ).not.toHaveBeenCalled();
    });

    describe('PASSWORD_RESET rate limiting', () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.PASSWORD_RESET,
        limit: 5,
        windowSeconds: 3600,
      };

      it('should allow request when rate limit not exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);

        const result = await guard.canActivate(
          mockExecutionContext as ExecutionContext,
        );

        expect(result).toBe(true);
        expect(
          mockRateLimitService.checkPasswordResetLimit,
        ).toHaveBeenCalledWith('192.168.1.1');
        expect(mockAuditService.logRateLimitViolation).not.toHaveBeenCalled();
      });

      it('should throw HttpException when rate limit exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(false);

        await expect(
          guard.canActivate(mockExecutionContext as ExecutionContext),
        ).rejects.toThrow(HttpException);

        await expect(
          guard.canActivate(mockExecutionContext as ExecutionContext),
        ).rejects.toMatchObject({
          response: {
            success: false,
            error: {
              code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
            },
          },
          status: HttpStatus.TOO_MANY_REQUESTS,
        });

        expect(mockAuditService.logRateLimitViolation).toHaveBeenCalledWith(
          '192.168.1.1',
          '/auth/forgot-password',
          RateLimitType.PASSWORD_RESET,
        );
      });
    });

    describe('LOGIN_ATTEMPT rate limiting', () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.LOGIN_ATTEMPT,
        limit: 10,
        windowSeconds: 900,
      };

      it('should allow request when rate limit not exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkLoginAttemptLimit.mockResolvedValue(true);

        const result = await guard.canActivate(
          mockExecutionContext as ExecutionContext,
        );

        expect(result).toBe(true);
        expect(
          mockRateLimitService.checkLoginAttemptLimit,
        ).toHaveBeenCalledWith('192.168.1.1');
        expect(mockAuditService.logRateLimitViolation).not.toHaveBeenCalled();
      });

      it('should throw HttpException when rate limit exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkLoginAttemptLimit.mockResolvedValue(false);

        await expect(
          guard.canActivate(mockExecutionContext as ExecutionContext),
        ).rejects.toThrow(HttpException);

        expect(mockAuditService.logRateLimitViolation).toHaveBeenCalledWith(
          '192.168.1.1',
          '/auth/forgot-password',
          RateLimitType.LOGIN_ATTEMPT,
        );
      });
    });

    describe('PASSWORD_CHANGE rate limiting', () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.PASSWORD_CHANGE,
        limit: 3,
        windowSeconds: 3600,
      };

      it('should allow request when rate limit not exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkPasswordChangeLimit.mockResolvedValue(true);

        const result = await guard.canActivate(
          mockExecutionContext as ExecutionContext,
        );

        expect(result).toBe(true);
        expect(
          mockRateLimitService.checkPasswordChangeLimit,
        ).toHaveBeenCalledWith('user-123');
        expect(mockAuditService.logRateLimitViolation).not.toHaveBeenCalled();
      });

      it('should throw HttpException when rate limit exceeded', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
        mockRateLimitService.checkPasswordChangeLimit.mockResolvedValue(false);

        await expect(
          guard.canActivate(mockExecutionContext as ExecutionContext),
        ).rejects.toThrow(HttpException);

        expect(mockAuditService.logRateLimitViolation).toHaveBeenCalledWith(
          '192.168.1.1',
          '/auth/forgot-password',
          RateLimitType.PASSWORD_CHANGE,
        );
      });

      it('should allow request when no user ID is present', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);

        // Mock execution context without user
        const contextWithoutUser = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              ip: '192.168.1.1',
              url: '/auth/change-password',
            }),
          }),
          getHandler: jest.fn(),
          getClass: jest.fn(),
        };

        const result = await guard.canActivate(
          contextWithoutUser as ExecutionContext,
        );

        expect(result).toBe(true);
        expect(
          mockRateLimitService.checkPasswordChangeLimit,
        ).not.toHaveBeenCalled();
      });
    });

    it('should handle unknown rate limit type gracefully', async () => {
      const unknownConfig = {
        type: 'unknown_type' as RateLimitType,
        limit: 5,
        windowSeconds: 3600,
      };

      jest.spyOn(reflector, 'get').mockReturnValue(unknownConfig);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
    });

    it('should fail open when rate limit service throws error', async () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.PASSWORD_RESET,
        limit: 5,
        windowSeconds: 3600,
      };

      jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
      mockRateLimitService.checkPasswordResetLimit.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      // Should fail open (allow request) on service error
      expect(result).toBe(true);
    });

    it('should extract IP address from different sources', async () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.PASSWORD_RESET,
        limit: 5,
        windowSeconds: 3600,
      };

      jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);

      // Test with connection.remoteAddress
      const contextWithConnection = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            connection: { remoteAddress: '10.0.0.1' },
            url: '/auth/forgot-password',
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      await guard.canActivate(contextWithConnection as ExecutionContext);

      expect(mockRateLimitService.checkPasswordResetLimit).toHaveBeenCalledWith(
        '10.0.0.1',
      );
    });

    it('should use "unknown" IP when no IP is available', async () => {
      const rateLimitConfig: RateLimitConfig = {
        type: RateLimitType.PASSWORD_RESET,
        limit: 5,
        windowSeconds: 3600,
      };

      jest.spyOn(reflector, 'get').mockReturnValue(rateLimitConfig);
      mockRateLimitService.checkPasswordResetLimit.mockResolvedValue(true);

      // Test with no IP
      const contextWithoutIP = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/auth/forgot-password',
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };

      await guard.canActivate(contextWithoutIP as ExecutionContext);

      expect(mockRateLimitService.checkPasswordResetLimit).toHaveBeenCalledWith(
        'unknown',
      );
    });
  });
});
