import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsEnum } from '../../common/enums/permissions.enum';

/**
 * Example controller demonstrating authentication and authorization usage
 */
@Controller('example')
export class ExampleController {
  /**
   * Public endpoint - no authentication required
   */
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }

  /**
   * Protected endpoint - requires authentication only
   */
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtectedData() {
    return { message: 'This requires authentication' };
  }

  /**
   * Admin only endpoint - requires authentication + admin permission
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.ADMIN_ACCESS])
  getAdminData() {
    return { message: 'This requires admin permissions' };
  }

  /**
   * User management endpoint - requires authentication + user management permission
   */
  @Post('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.USER_CREATE])
  createUser(@Body() userData: any) {
    return { message: 'User created', data: userData };
  }

  /**
   * Multiple permissions required (ALL)
   */
  @Get('admin-users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.ADMIN_ACCESS, PermissionsEnum.USER_LIST], {
    requireAll: true,
  })
  getAdminUsers() {
    return {
      message: 'This requires both admin access AND user list permissions',
    };
  }

  /**
   * Multiple permissions (ANY)
   */
  @Get('user-or-admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.USER_READ, PermissionsEnum.ADMIN_ACCESS], {
    requireAll: false,
  })
  getUserOrAdminData() {
    return {
      message: 'This requires either user read OR admin access permission',
    };
  }

  /**
   * Self access allowed - users can access their own data
   */
  @Get('users/:userId/profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions([PermissionsEnum.USER_READ], {
    allowSelf: true,
    selfParam: 'userId',
  })
  getUserProfile() {
    return {
      message:
        'User can access their own profile or admin can access any profile',
    };
  }
}

/**
 * Usage Notes:
 *
 * 1. AUTHENTICATION ONLY:
 *    - Use @UseGuards(JwtAuthGuard)
 *    - Requires valid JWT token
 *    - User object available in request
 *
 * 2. AUTHENTICATION + AUTHORIZATION:
 *    - Use @UseGuards(JwtAuthGuard, PermissionsGuard)
 *    - Add @Permissions() decorator with required permissions
 *    - Both guards work together
 *
 * 3. GUARD ORDER MATTERS:
 *    - JwtAuthGuard MUST come before PermissionsGuard
 *    - JwtAuthGuard attaches user to request
 *    - PermissionsGuard reads user from request
 *
 * 4. PERMISSION OPTIONS:
 *    - requireAll: true = user must have ALL listed permissions
 *    - requireAll: false = user must have ANY of the listed permissions
 *    - allowSelf: true = users can access their own resources
 *    - selfParam: 'paramName' = parameter to check for self access
 *
 * 5. TOKEN USAGE:
 *    - Frontend should include: Authorization: Bearer <token>
 *    - Token contains user ID, email, and role
 *    - Token expires based on JWT_EXPIRES_IN config
 *
 * 6. ERROR RESPONSES:
 *    - 401 Unauthorized: No token or invalid token
 *    - 403 Forbidden: Valid token but insufficient permissions
 */
