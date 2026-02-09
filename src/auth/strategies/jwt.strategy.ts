import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthErrorCode } from '../../common/enums/auth-error-code.enum';
import { AUTH_ERROR_MESSAGES } from '../../common/constants/auth-error-messages.constant';
import * as crypto from 'crypto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(req: any, payload: any) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Check if token is blacklisted - Requirement 4.4
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const isBlacklisted =
        await this.sessionService.isTokenBlacklisted(tokenHash);

      if (isBlacklisted) {
        throw new UnauthorizedException({
          message: {
            ar: 'الجلسة غير صالحة',
            en: 'Session invalidated',
          },
          code: 'SESSION_INVALIDATED',
        });
      }

      // Validate session exists and is active - Requirement 4.3, 4.4
      const session = await this.sessionService.restoreSession(token);
      if (!session) {
        throw new UnauthorizedException({
          message: {
            ar: 'الجلسة غير موجودة أو منتهية الصلاحية',
            en: 'Session not found or expired',
          },
          code: 'SESSION_EXPIRED',
        });
      }
    }

    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        message: AUTH_ERROR_MESSAGES[AuthErrorCode.TOKEN_INVALID],
        code: AuthErrorCode.TOKEN_INVALID,
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: AUTH_ERROR_MESSAGES[AuthErrorCode.ACCOUNT_DEACTIVATED],
        code: AuthErrorCode.ACCOUNT_DEACTIVATED,
      });
    }

    // Return user object that will be attached to request
    return {
      id: (user._id as any).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      permissions: [], // Will be populated by permissions system if needed
    };
  }
}
