import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

/**
 * RolesGuard - Ensures user has one of the required roles
 *
 * This guard should be used after JwtAuthGuard to ensure the user is authenticated
 * and has one of the necessary roles.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user exists (should be populated by JwtAuthGuard)
    if (!user) {
      this.logger.warn('RolesGuard: No user found in request');
      throw new UnauthorizedException({
        message: {
          ar: 'المستخدم غير مصادق عليه',
          en: 'User not authenticated',
        },
        code: 'USER_NOT_AUTHENTICATED',
      });
    }

    // Check if user has one of the required roles
    // super_admin is always allowed
    const hasRole =
      user.role === UserRole.SUPER_ADMIN ||
      requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `RolesGuard: User ${user.id} with role ${user.role} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException({
        message: {
          ar: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          en: 'You do not have permission to access this resource',
        },
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    this.logger.log(
      `RolesGuard: User ${user.id} with role ${user.role} granted access`,
    );
    return true;
  }
}
