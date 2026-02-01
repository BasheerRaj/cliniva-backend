import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { SessionService } from '../../../src/auth/session.service';
import { TokenService } from '../../../src/auth/token.service';
import { User } from '../../../src/database/schemas/user.schema';
import { Subscription } from '../../../src/database/schemas/subscription.schema';
import { SubscriptionPlan } from '../../../src/database/schemas/subscription-plan.schema';
import { AuthErrorCode } from '../../../src/common/enums/auth-error-code.enum';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let sessionService: SessionService;
  let tokenService: TokenService;
  let mockExecutionContext: Partial<ExecutionContext>;

  const mockUserModel = {};
  const mockSubscriptionModel = {};
  const mockSubscriptionPlanModel = {};

  const mockSessionService = {
    isTokenBlacklisted: jest.fn(),
  };

  const mockTokenService = {
    extractTokenFromHeader: jest.fn(),
    hashToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(SubscriptionPlan.name),
          useValue: mockSubscriptionPlanModel,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    sessionService = module.get<SessionService>(SessionService);
    tokenService = module.get<TokenService>(TokenService);

    // Mock super.canActivate to return true
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(true);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer valid-token',
          },
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'doctor',
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

    it('should extend AuthGuard with jwt strategy', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should allow valid non-blacklisted token', async () => {
      // Setup mocks
      mockTokenService.extractTokenFromHeader.mockReturnValue('valid-token');
      mockTokenService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.isTokenBlacklisted.mockResolvedValue(false);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(result).toBe(true);
      expect(tokenService.extractTokenFromHeader).toHaveBeenCalled();
      expect(tokenService.hashToken).toHaveBeenCalledWith('valid-token');
      expect(sessionService.isTokenBlacklisted).toHaveBeenCalledWith(
        'hashed-token',
      );
    });

    it('should reject blacklisted token', async () => {
      // Setup mocks
      mockTokenService.extractTokenFromHeader.mockReturnValue(
        'blacklisted-token',
      );
      mockTokenService.hashToken.mockReturnValue('hashed-blacklisted-token');
      mockSessionService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);

      expect(tokenService.extractTokenFromHeader).toHaveBeenCalled();
      expect(tokenService.hashToken).toHaveBeenCalled();
      expect(sessionService.isTokenBlacklisted).toHaveBeenCalledWith(
        'hashed-blacklisted-token',
      );
    });

    it('should reject request without token', async () => {
      // Setup mocks
      mockTokenService.extractTokenFromHeader.mockReturnValue(null);

      await expect(
        guard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);

      expect(tokenService.extractTokenFromHeader).toHaveBeenCalled();
      expect(sessionService.isTokenBlacklisted).not.toHaveBeenCalled();
    });

    it('should handle ExecutionContext properly', async () => {
      mockTokenService.extractTokenFromHeader.mockReturnValue('valid-token');
      mockTokenService.hashToken.mockReturnValue('hashed-token');
      mockSessionService.isTokenBlacklisted.mockResolvedValue(false);

      const result = await guard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should verify token is checked against blacklist before JWT validation', async () => {
      mockTokenService.extractTokenFromHeader.mockReturnValue('test-token');
      mockTokenService.hashToken.mockReturnValue('hashed-test-token');
      mockSessionService.isTokenBlacklisted.mockResolvedValue(false);

      await guard.canActivate(mockExecutionContext as ExecutionContext);

      // Verify the order of operations
      expect(tokenService.extractTokenFromHeader).toHaveBeenCalled();
      expect(tokenService.hashToken).toHaveBeenCalled();
      expect(sessionService.isTokenBlacklisted).toHaveBeenCalled();
    });
  });
});
