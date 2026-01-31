import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService, JwtPayload } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '24h',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear mock calls
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with 24h expiration', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      const expectedToken = 'access-token-123';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const token = service.generateAccessToken(payload);

      expect(token).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-secret',
        expiresIn: '24h',
      });
    });

    it('should throw error if token generation fails', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      expect(() => service.generateAccessToken(payload)).toThrow('Failed to generate access token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with 7d expiration', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      const expectedToken = 'refresh-token-123';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const token = service.generateRefreshToken(payload);

      expect(token).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-refresh-secret',
        expiresIn: '7d',
      });
    });

    it('should throw error if token generation fails', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      expect(() => service.generateRefreshToken(payload)).toThrow('Failed to generate refresh token');
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid access token', async () => {
      const token = 'valid-access-token';
      const expectedPayload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 1234654290,
      };

      mockJwtService.verify.mockReturnValue(expectedPayload);

      const payload = await service.verifyToken(token, false);

      expect(payload).toEqual(expectedPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-secret',
      });
    });

    it('should verify and return payload for valid refresh token', async () => {
      const token = 'valid-refresh-token';
      const expectedPayload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 1235172690,
      };

      mockJwtService.verify.mockReturnValue(expectedPayload);

      const payload = await service.verifyToken(token, true);

      expect(payload).toEqual(expectedPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw error for expired token', async () => {
      const token = 'expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken(token)).rejects.toThrow('Token expired');
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken(token)).rejects.toThrow('Invalid token');
    });

    it('should throw generic error for other verification failures', async () => {
      const token = 'problematic-token';
      const error = new Error('Unknown error');
      error.name = 'UnknownError';

      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken(token)).rejects.toThrow('Token verification failed');
    });
  });

  describe('hashToken', () => {
    it('should hash token using SHA-256', () => {
      const token = 'test-token-123';
      const hash = service.hashToken(token);

      // SHA-256 hash should be 64 characters (hex)
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same token', () => {
      const token = 'test-token-123';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'test-token-123';
      const token2 = 'test-token-456';
      const hash1 = service.hashToken(token1);
      const hash2 = service.hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer valid-token-123';
      const token = service.extractTokenFromHeader(authHeader);

      expect(token).toBe('valid-token-123');
    });

    it('should return null for missing header', () => {
      const token = service.extractTokenFromHeader(undefined);

      expect(token).toBeNull();
    });

    it('should return null for invalid format (no Bearer)', () => {
      const authHeader = 'Token valid-token-123';
      const token = service.extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for invalid format (no token)', () => {
      const authHeader = 'Bearer';
      const token = service.extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for empty token', () => {
      const authHeader = 'Bearer ';
      const token = service.extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for header with extra parts', () => {
      const authHeader = 'Bearer token extra';
      const token = service.extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      mockJwtService.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-123');

      const tokens = service.generateTokenPair(payload);

      expect(tokens).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTokenExpirySeconds', () => {
    it('should return access token expiry in seconds (24h = 86400s)', () => {
      const expiry = service.getTokenExpirySeconds(false);
      expect(expiry).toBe(86400);
    });

    it('should return refresh token expiry in seconds (7d = 604800s)', () => {
      const expiry = service.getTokenExpirySeconds(true);
      expect(expiry).toBe(604800);
    });
  });

  describe('parseTimeToSeconds', () => {
    it('should parse seconds correctly', () => {
      const service = new TokenService(jwtService, configService);
      expect(service['parseTimeToSeconds']('60s')).toBe(60);
    });

    it('should parse minutes correctly', () => {
      const service = new TokenService(jwtService, configService);
      expect(service['parseTimeToSeconds']('30m')).toBe(1800);
    });

    it('should parse hours correctly', () => {
      const service = new TokenService(jwtService, configService);
      expect(service['parseTimeToSeconds']('24h')).toBe(86400);
    });

    it('should parse days correctly', () => {
      const service = new TokenService(jwtService, configService);
      expect(service['parseTimeToSeconds']('7d')).toBe(604800);
    });

    it('should default to 24h for invalid format', () => {
      const service = new TokenService(jwtService, configService);
      expect(service['parseTimeToSeconds']('invalid')).toBe(86400);
    });
  });
});
