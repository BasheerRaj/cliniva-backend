import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { AuthService } from '../../../src/auth/auth.service';
import { mockAuthService, mockUser, mockJwtPayload, mockJwtUser } from '../mocks/auth.mocks';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    // Set environment variable for testing
    process.env.JWT_SECRET = 'test-jwt-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => {
        new JwtStrategy(authService);
      }).toThrow('JWT_SECRET environment variable is not configured');
    });

    it('should initialize with JWT_SECRET', () => {
      process.env.JWT_SECRET = 'test-jwt-secret';
      
      expect(() => {
        new JwtStrategy(authService);
      }).not.toThrow();
    });
  });

  describe('validate', () => {
    it('should return user object for valid payload', async () => {
      mockAuthService.validateUserById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockJwtPayload);

      expect(authService.validateUserById).toHaveBeenCalledWith(mockJwtPayload.sub);
      expect(result).toEqual(mockJwtUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockAuthService.validateUserById.mockResolvedValue(null);

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      
      expect(authService.validateUserById).toHaveBeenCalledWith(mockJwtPayload.sub);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockAuthService.validateUserById.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user with permissions array', async () => {
      mockAuthService.validateUserById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockJwtPayload);

      expect(result).toHaveProperty('permissions');
      expect(Array.isArray(result.permissions)).toBe(true);
    });
  });
});




