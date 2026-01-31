import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string;      // User ID
  email: string;    // User email
  role: string;     // User role
  iat?: number;     // Issued at
  exp?: number;     // Expiration
}

/**
 * TokenService - Utility service for JWT token operations
 * 
 * Provides methods for:
 * - Generating access tokens (24h expiration)
 * - Generating refresh tokens (7d expiration)
 * - Verifying token signatures and expiration
 * - Hashing tokens for blacklist storage
 * - Extracting tokens from Authorization headers
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.7
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Load configuration
    this.accessTokenExpiry = this.configService.get<string>('JWT_EXPIRES_IN', '24h');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
    this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.jwtSecret + '_refresh';

    if (!this.jwtSecret) {
      this.logger.error('JWT_SECRET is not configured');
      throw new Error('JWT_SECRET must be configured');
    }
  }

  /**
   * Generate access token with 24-hour expiration
   * 
   * @param payload - JWT payload containing userId, email, and role
   * @returns Signed JWT access token
   * 
   * Requirement 7.1: Access tokens expire in 24 hours
   * Requirement 7.7: JWT payload includes userId, email, and role
   */
  generateAccessToken(payload: JwtPayload): string {
    try {
      const token = this.jwtService.sign(payload, {
        secret: this.jwtSecret,
        expiresIn: this.accessTokenExpiry,
      });

      this.logger.debug(`Generated access token for user ${payload.sub}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate access token: ${error.message}`, error.stack);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token with 7-day expiration
   * 
   * @param payload - JWT payload containing userId, email, and role
   * @returns Signed JWT refresh token
   * 
   * Requirement 7.2: Refresh tokens expire in 7 days
   * Requirement 7.7: JWT payload includes userId, email, and role
   */
  generateRefreshToken(payload: JwtPayload): string {
    try {
      const token = this.jwtService.sign(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.refreshTokenExpiry,
      });

      this.logger.debug(`Generated refresh token for user ${payload.sub}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate refresh token: ${error.message}`, error.stack);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify token signature and expiration
   * 
   * @param token - JWT token to verify
   * @param isRefreshToken - Whether this is a refresh token (default: false)
   * @returns Decoded JWT payload if valid
   * @throws Error if token is invalid or expired
   * 
   * Requirement 7.3: Validate token signature and expiration
   */
  async verifyToken(token: string, isRefreshToken: boolean = false): Promise<JwtPayload> {
    try {
      const secret = isRefreshToken ? this.jwtRefreshSecret : this.jwtSecret;
      
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret,
      });

      this.logger.debug(`Token verified for user ${payload.sub}`);
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Token expired: ${error.message}`);
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn(`Invalid token: ${error.message}`);
        throw new Error('Invalid token');
      } else {
        this.logger.error(`Token verification failed: ${error.message}`, error.stack);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Hash token using SHA-256 for blacklist storage
   * 
   * @param token - JWT token to hash
   * @returns SHA-256 hash of the token
   * 
   * Used for storing tokens in the blacklist without storing the actual token.
   * This provides security by ensuring blacklisted tokens cannot be recovered.
   */
  hashToken(token: string): string {
    try {
      const hash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      this.logger.debug('Token hashed for blacklist storage');
      return hash;
    } catch (error) {
      this.logger.error(`Failed to hash token: ${error.message}`, error.stack);
      throw new Error('Failed to hash token');
    }
  }

  /**
   * Extract token from Authorization header
   * 
   * @param authHeader - Authorization header value (e.g., "Bearer <token>")
   * @returns Extracted token or null if invalid format
   * 
   * Parses the Bearer token format and returns the token string.
   * Returns null if the header is missing or not in the correct format.
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      this.logger.debug('No authorization header provided');
      return null;
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      this.logger.warn('Invalid authorization header format');
      return null;
    }

    const token = parts[1];
    
    if (!token || token.trim() === '') {
      this.logger.warn('Empty token in authorization header');
      return null;
    }

    this.logger.debug('Token extracted from authorization header');
    return token;
  }

  /**
   * Generate both access and refresh tokens
   * 
   * @param payload - JWT payload containing userId, email, and role
   * @returns Object containing both access and refresh tokens
   * 
   * Convenience method for generating both token types at once.
   */
  generateTokenPair(payload: JwtPayload): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Get token expiration time in seconds
   * 
   * @param isRefreshToken - Whether to get refresh token expiry (default: false)
   * @returns Expiration time in seconds
   */
  getTokenExpirySeconds(isRefreshToken: boolean = false): number {
    const timeString = isRefreshToken ? this.refreshTokenExpiry : this.accessTokenExpiry;
    return this.parseTimeToSeconds(timeString);
  }

  /**
   * Parse time string to seconds
   * 
   * @param timeString - Time string (e.g., "24h", "7d", "60s")
   * @returns Time in seconds
   */
  private parseTimeToSeconds(timeString: string): number {
    const matches = timeString.match(/^(\d+)([smhd])$/);
    if (!matches) {
      this.logger.warn(`Invalid time format: ${timeString}, defaulting to 24 hours`);
      return 86400; // default 24 hours
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: 
        this.logger.warn(`Unknown time unit: ${unit}, defaulting to 24 hours`);
        return 86400;
    }
  }
}
