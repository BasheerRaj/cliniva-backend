import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthErrorCode } from '../../common/enums/auth-error-code.enum';
import { AUTH_ERROR_MESSAGES } from '../../common/constants/auth-error-messages.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
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
