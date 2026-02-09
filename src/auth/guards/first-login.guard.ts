import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { AuthErrorCode } from '../../common/enums/auth-error-code.enum';
import { AUTH_ERROR_MESSAGES } from '../../common/constants/auth-error-messages.constant';

/**
 * Metadata key for marking endpoints that should skip first login check
 */
export const SKIP_FIRST_LOGIN_CHECK = 'skipFirstLoginCheck';

/**
 * Decorator to skip first login password change enforcement
 * Use this on the first-login-password-change endpoint
 */
export const SkipFirstLoginCheck = () => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      SKIP_FIRST_LOGIN_CHECK,
      true,
      descriptor?.value || target,
    );
    return descriptor || target;
  };
};

/**
 * FirstLoginGuard enforces password change requirement for users on their first login
 *
 * Requirements:
 * - Extract user from request (after JWT validation)
 * - Check if user.isFirstLogin is true
 * - If true and endpoint is not password change, throw ForbiddenException with AUTH_009
 * - If false or endpoint is password change, allow request
 *
 * Usage:
 * - Apply after JwtAuthGuard to ensure user is authenticated
 * - Use @SkipFirstLoginCheck() decorator on first-login-password-change endpoint
 *
 * @see Requirements 1.2, 1.6
 */
@Injectable()
export class FirstLoginGuard implements CanActivate {
  private readonly logger = new Logger(FirstLoginGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this endpoint should skip first login check
    const skipCheck = this.reflector.get<boolean>(
      SKIP_FIRST_LOGIN_CHECK,
      context.getHandler(),
    );

    if (skipCheck) {
      this.logger.debug('Skipping first login check for this endpoint');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User should be populated by JwtAuthGuard
    // JWT strategy returns 'id', not 'userId'
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!user || !userId) {
      this.logger.warn(
        'No user found in request - JwtAuthGuard should run first',
      );
      throw new ForbiddenException({
        message: AUTH_ERROR_MESSAGES[AuthErrorCode.TOKEN_INVALID],
        code: AuthErrorCode.TOKEN_INVALID,
      });
    }

    try {
      // Fetch complete user data to check isFirstLogin flag
      const userDoc = await this.userModel.findById(userId).exec();

      if (!userDoc) {
        this.logger.warn(`User not found: ${userId}`);
        throw new ForbiddenException({
          message: AUTH_ERROR_MESSAGES[AuthErrorCode.USER_NOT_FOUND],
          code: AuthErrorCode.USER_NOT_FOUND,
        });
      }

      // Check if user is on first login
      if (userDoc.isFirstLogin === true) {
        this.logger.warn(
          `User ${userId} attempted to access protected resource without changing password`,
        );

        // Throw ForbiddenException with AUTH_009 code
        throw new ForbiddenException({
          message: AUTH_ERROR_MESSAGES[AuthErrorCode.PASSWORD_CHANGE_REQUIRED],
          code: AuthErrorCode.PASSWORD_CHANGE_REQUIRED,
        });
      }

      // User has completed first login password change, allow access
      this.logger.debug(`First login check passed for user: ${userId}`);
      return true;
    } catch (error) {
      // If it's already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // For other errors, log and throw generic error
      this.logger.error(
        `First login guard error: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException({
        message: {
          ar: 'حدث خطأ أثناء التحقق من حالة تسجيل الدخول',
          en: 'Error verifying login status',
        },
        code: 'FIRST_LOGIN_CHECK_FAILED',
      });
    }
  }
}
