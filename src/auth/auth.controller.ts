import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Param,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Headers,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import {
  FirstLoginGuard,
  SkipFirstLoginCheck,
} from './guards/first-login.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import {
  RateLimit,
  RateLimitType,
} from '../common/decorators/rate-limit.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthResponseDto,
  UserProfileDto,
  FirstLoginPasswordChangeDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import {
  REGISTER_REQUEST_EXAMPLE,
  REGISTER_RESPONSE_EXAMPLE,
  LOGIN_REQUEST_EXAMPLE,
  LOGIN_RESPONSE_EXAMPLE,
  LOGIN_FIRST_TIME_RESPONSE_EXAMPLE,
  FIRST_LOGIN_PASSWORD_CHANGE_REQUEST_EXAMPLE,
  FIRST_LOGIN_PASSWORD_CHANGE_RESPONSE_EXAMPLE,
  CHANGE_PASSWORD_REQUEST_EXAMPLE,
  CHANGE_PASSWORD_RESPONSE_EXAMPLE,
  FORGOT_PASSWORD_REQUEST_EXAMPLE,
  FORGOT_PASSWORD_RESPONSE_EXAMPLE,
  RESET_PASSWORD_REQUEST_EXAMPLE,
  RESET_PASSWORD_RESPONSE_EXAMPLE,
  REFRESH_TOKEN_REQUEST_EXAMPLE,
  REFRESH_TOKEN_RESPONSE_EXAMPLE,
  GET_PROFILE_RESPONSE_EXAMPLE,
  LOGOUT_RESPONSE_EXAMPLE,
  ERROR_INVALID_CREDENTIALS_EXAMPLE,
  ERROR_EMAIL_EXISTS_EXAMPLE,
  ERROR_ACCOUNT_INACTIVE_EXAMPLE,
  ERROR_PASSWORDS_DO_NOT_MATCH_EXAMPLE,
  ERROR_INVALID_CURRENT_PASSWORD_EXAMPLE,
  ERROR_RATE_LIMIT_EXCEEDED_EXAMPLE,
  ERROR_TOKEN_EXPIRED_EXAMPLE,
  ERROR_TOKEN_BLACKLISTED_EXAMPLE,
  ERROR_PASSWORD_RESET_TOKEN_INVALID_EXAMPLE,
  ERROR_PASSWORD_RESET_TOKEN_EXPIRED_EXAMPLE,
  ERROR_UNAUTHORIZED_EXAMPLE,
  ERROR_VALIDATION_EXAMPLE,
} from './examples/swagger-examples';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   *
   * Role-based authorization rules:
   * - Owner and Patient can self-register (no auth needed)
   * - No one can create a super_admin
   * - Only owner or super_admin can create an admin
   * - Admin can create manager, doctor, staff, patient
   * - Created users inherit the creator's organization scope
   */
  @Post('register')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account. Owner and Patient can self-register without authentication. ' +
      'Admin, Manager, Doctor, and Staff roles require an authenticated user with sufficient privileges. ' +
      'No one can create a super_admin account. ' +
      'When creating users with elevated roles, pass the Authorization header with a valid JWT token.',
  })
  @ApiBearerAuth()
  @ApiBody({
    type: RegisterDto,
    description: 'User registration details',
    examples: {
      owner_self_register: {
        summary: 'Self-register as owner (no auth needed)',
        value: REGISTER_REQUEST_EXAMPLE,
      },
      admin_creation: {
        summary: 'Create admin (requires owner/super_admin auth)',
        value: {
          email: 'admin@example.com',
          password: 'Admin123!',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          phone: '+966501234567',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: REGISTER_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions to create this role',
    schema: {
      example: {
        statusCode: 403,
        message: {
          ar: 'ليس لديك صلاحية لإنشاء حساب بهذا الدور',
          en: 'You do not have permission to create a user with this role',
        },
        code: 'INSUFFICIENT_ROLE_PERMISSION',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: ERROR_EMAIL_EXISTS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: ERROR_VALIDATION_EXAMPLE,
    },
  })
  async register(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    registerDto: RegisterDto,
    @Request() req: any,
  ): Promise<AuthResponseDto> {
    // Extract creator user info from JWT if present (populated by OptionalJwtAuthGuard)
    const creatorUser = req.user
      ? {
          id: req.user.id || req.user.userId || req.user.sub,
          role: req.user.role,
          email: req.user.email,
        }
      : null;

    return this.authService.register(registerDto, creatorUser);
  }

  /**
   * Login user
   *
   * Task 12.1: Extract IP address and user agent for audit logging
   * Task 21.1: Apply rate limiting (10 attempts per 15 minutes)
   *
   * Requirements: 9.2
   */
  @Post('login')
  @UseGuards(RateLimitGuard) // Temporarily disabled for testing
  @RateLimit(RateLimitType.LOGIN_ATTEMPT, 10, 900) // 10 attempts per 15 minutes (900 seconds)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate user with email and password. Returns access and refresh tokens. Rate limited to 10 attempts per 15 minutes per IP address.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      default: {
        summary: 'Login with credentials',
        value: LOGIN_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      oneOf: [
        {
          description: 'Regular login',
          example: LOGIN_RESPONSE_EXAMPLE,
        },
        {
          description: 'First time login (password change required)',
          example: LOGIN_FIRST_TIME_RESPONSE_EXAMPLE,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account inactive',
    schema: {
      oneOf: [
        { example: ERROR_INVALID_CREDENTIALS_EXAMPLE },
        { example: ERROR_ACCOUNT_INACTIVE_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: ERROR_RATE_LIMIT_EXCEEDED_EXAMPLE,
    },
  })
  async login(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    loginDto: LoginDto,
    @Request() req: any,
  ): Promise<AuthResponseDto> {
    // Extract IP address from request
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

    // Extract user agent from request headers
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * First login setup (working hours)
   *
   * UC-first-login: Part 1 - Working hours setup
   */
  @Post('first-login-setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Setup working hours on first login',
    description: 'Allows users to configure their working schedule during first login.',
  })
  async firstLoginSetup(
    @Body() scheduleDto: any,
    @Request() req: any,
  ): Promise<{ success: boolean; message: any }> {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.authService.firstLoginSetup(userId, scheduleDto);
  }

  // ==========================================
  // THIRD-PARTY OAUTH LOGIN (PLACEHOLDERS)
  // UC-3d3r2d7 (Google), UC-91a5d3 (Microsoft), UC-0b8e6a (Apple)
  // ==========================================

  @Get('google')
  @ApiOperation({
    summary: 'Google Login',
    description: 'Redirects to Google OAuth consent page.',
  })
  async googleLogin() {
    return {
      message: 'Redirecting to Google...',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
    };
  }

  @Post('google/callback')
  @ApiOperation({
    summary: 'Google OAuth Callback',
    description: 'Handles Google OAuth callback and returns tokens.',
  })
  async googleCallback(@Body() body: any) {
    // Placeholder implementation
    return {
      success: false,
      message: 'Google login implementation pending API credentials',
    };
  }

  @Get('microsoft')
  @ApiOperation({
    summary: 'Microsoft Login',
    description: 'Redirects to Microsoft OAuth consent page.',
  })
  async microsoftLogin() {
    return {
      message: 'Redirecting to Microsoft...',
      url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...',
    };
  }

  @Get('apple')
  @ApiOperation({
    summary: 'Apple Login',
    description: 'Redirects to Apple OAuth consent page.',
  })
  async appleLogin() {
    return {
      message: 'Redirecting to Apple...',
      url: 'https://appleid.apple.com/auth/authorize?...',
    };
  }

  /**
   * First login password change
   *
   * Task 15.1: Create POST /auth/first-login-password-change endpoint
   * Requirements: 8.1, 8.6
   *
   * This endpoint allows users to change their password on first login.
   * It applies JwtAuthGuard (but not FirstLoginGuard) to allow first-time users to access it.
   * The @SkipFirstLoginCheck decorator ensures FirstLoginGuard doesn't block this endpoint.
   */
  @Post('first-login-password-change')
  @UseGuards(JwtAuthGuard)
  @SkipFirstLoginCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password on first login',
    description:
      'Allows users with isFirstLogin=true to change their password. Returns new tokens with isFirstLogin=false. Requires JWT authentication.',
  })
  @ApiBody({
    type: FirstLoginPasswordChangeDto,
    description: 'Password change details',
    examples: {
      default: {
        summary: 'Change password on first login',
        value: FIRST_LOGIN_PASSWORD_CHANGE_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: FIRST_LOGIN_PASSWORD_CHANGE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or password mismatch',
    schema: {
      oneOf: [
        { example: ERROR_PASSWORDS_DO_NOT_MATCH_EXAMPLE },
        { example: ERROR_INVALID_CURRENT_PASSWORD_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  async firstLoginPasswordChange(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: FirstLoginPasswordChangeDto,
    @Request() req: any,
  ): Promise<AuthResponseDto> {
    try {
      // Extract userId from JWT payload (populated by JwtAuthGuard)
      // JWT strategy returns 'id', not 'userId'
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
        throw new BadRequestException({
          message: {
            ar: 'معرف المستخدم غير موجود',
            en: 'User ID not found',
          },
          code: 'USER_ID_NOT_FOUND',
        });
      }

      // Validate that passwords match
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException({
          message: {
            ar: 'كلمات المرور غير متطابقة',
            en: 'Passwords do not match',
          },
          code: 'PASSWORDS_DO_NOT_MATCH',
        });
      }

      // Call AuthService.firstLoginPasswordChange
      const result = await this.authService.firstLoginPasswordChange(
        userId,
        dto.currentPassword,
        dto.newPassword,
      );

      // Return AuthResponse with new tokens
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(
        `First login password change failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل تغيير كلمة المرور',
          en: 'Password change failed',
        },
        code: 'PASSWORD_CHANGE_FAILED',
      });
    }
  }

  /**
   * Change password for authenticated users
   *
   * Task 15.2: Create POST /auth/change-password endpoint
   * Task 21.1: Apply rate limiting (3 attempts per hour)
   * Requirements: 8.2, 8.6, 8.8, 9.3
   *
   * This endpoint allows authenticated users to change their password.
   * It applies both JwtAuthGuard and FirstLoginGuard to ensure:
   * 1. User is authenticated (JwtAuthGuard)
   * 2. User has completed first login password change (FirstLoginGuard)
   * 3. Rate limiting (3 attempts per hour per user)
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard, FirstLoginGuard, RateLimitGuard)
  @RateLimit(RateLimitType.PASSWORD_CHANGE, 3, 3600) // 3 attempts per hour (3600 seconds)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description:
      'Change password for authenticated users. Rate limited to 3 attempts per hour per user. Requires JWT authentication and completed first login.',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Password change details',
    examples: {
      default: {
        summary: 'Change password',
        value: CHANGE_PASSWORD_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: CHANGE_PASSWORD_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or password mismatch',
    schema: {
      oneOf: [
        { example: ERROR_PASSWORDS_DO_NOT_MATCH_EXAMPLE },
        { example: ERROR_INVALID_CURRENT_PASSWORD_EXAMPLE },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: ERROR_RATE_LIMIT_EXCEEDED_EXAMPLE,
    },
  })
  async changePassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ChangePasswordDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Extract userId from JWT payload (populated by JwtAuthGuard)
      // JWT strategy returns 'id', not 'userId'
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
        throw new BadRequestException({
          message: {
            ar: 'معرف المستخدم غير موجود',
            en: 'User ID not found',
          },
          code: 'USER_ID_NOT_FOUND',
        });
      }

      // Validate that passwords match
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException({
          message: {
            ar: 'كلمات المرور غير متطابقة',
            en: 'Passwords do not match',
          },
          code: 'PASSWORDS_DO_NOT_MATCH',
        });
      }

      // Call AuthService.changePassword
      const result = await this.authService.changePassword(
        userId,
        dto.currentPassword,
        dto.newPassword,
      );

      // Return SuccessResponse
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(
        `Password change failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: {
          ar: 'فشل تغيير كلمة المرور',
          en: 'Password change failed',
        },
        code: 'PASSWORD_CHANGE_FAILED',
      });
    }
  }

  /**
   * Forgot password - Request password reset
   *
   * Task 15.3: Create POST /auth/forgot-password endpoint
   * Task 21.1: Apply rate limiting (5 requests per hour)
   * Requirements: 8.3, 8.6, 8.9, 9.1
   *
   * This is a public endpoint (no guards) that allows users to request a password reset.
   * It extracts the IP address from the request for rate limiting and audit logging.
   * Returns the same response whether the email exists or not for security.
   * Rate limited to 5 requests per hour per IP address.
   */
  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(RateLimitType.PASSWORD_RESET, 5, 3600) // 5 requests per hour (3600 seconds)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Request a password reset email. Returns the same response whether the email exists or not for security. Rate limited to 5 requests per hour per IP address.',
  })
  @ApiBody({
    description: 'Email address for password reset',
    examples: {
      default: {
        summary: 'Request password reset',
        value: FORGOT_PASSWORD_REQUEST_EXAMPLE,
      },
    },
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Request processed (same response whether email exists or not)',
    schema: {
      example: FORGOT_PASSWORD_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: ERROR_RATE_LIMIT_EXCEEDED_EXAMPLE,
    },
  })
  async forgotPassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ForgotPasswordDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Extract IP address from request
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

      // Call AuthService.forgotPassword
      const result = await this.authService.forgotPassword(
        dto.email,
        ipAddress,
      );

      // Return SuccessResponse (same response whether email exists or not)
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(
        `Forgot password request failed: ${error.message}`,
        error.stack,
      );

      // Return generic success message even on error to avoid revealing information
      return {
        success: true,
        message: {
          ar: 'إذا كان البريد الإلكتروني موجوداً في نظامنا، ستتلقى رسالة لإعادة تعيين كلمة المرور',
          en: 'If the email exists in our system, you will receive a password reset email',
        },
      };
    }
  }

  /**
   * Reset password - Complete password reset with token
   *
   * Task 15.4: Create POST /auth/reset-password endpoint
   * Requirements: 8.4, 8.6, 8.9
   *
   * This is a public endpoint (no guards) that allows users to reset their password
   * using a valid reset token received via email.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Reset password using the token received via email. Token is valid for 24 hours and can only be used once.',
  })
  @ApiBody({
    description: 'Password reset details',
    examples: {
      default: {
        summary: 'Reset password',
        value: RESET_PASSWORD_REQUEST_EXAMPLE,
      },
    },
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: '64-character hex token from email',
          example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
        },
        newPassword: {
          type: 'string',
          minLength: 8,
          description: 'New password (min 8 chars, complexity required)',
          example: 'NewSecurePass123!',
        },
        confirmPassword: {
          type: 'string',
          description: 'Confirmation of new password',
          example: 'NewSecurePass123!',
        },
      },
      required: ['token', 'newPassword', 'confirmPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: RESET_PASSWORD_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid, expired, or used token',
    schema: {
      oneOf: [
        { example: ERROR_PASSWORD_RESET_TOKEN_INVALID_EXAMPLE },
        { example: ERROR_PASSWORD_RESET_TOKEN_EXPIRED_EXAMPLE },
        { example: ERROR_PASSWORDS_DO_NOT_MATCH_EXAMPLE },
      ],
    },
  })
  async resetPassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ResetPasswordDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Validate that passwords match
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException({
          message: {
            ar: 'كلمات المرور غير متطابقة',
            en: 'Passwords do not match',
          },
          code: 'PASSWORDS_DO_NOT_MATCH',
        });
      }

      // Call AuthService.resetPassword
      const result = await this.authService.resetPassword(
        dto.token,
        dto.newPassword,
      );

      // Return SuccessResponse
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw new BadRequestException({
        message: {
          ar: 'فشل إعادة تعيين كلمة المرور',
          en: 'Password reset failed',
        },
        code: 'PASSWORD_RESET_FAILED',
      });
    }
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtain new access and refresh tokens using a valid refresh token. Old refresh token is blacklisted (single-use).',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token',
    examples: {
      default: {
        summary: 'Refresh token',
        value: REFRESH_TOKEN_REQUEST_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: REFRESH_TOKEN_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid, expired, or blacklisted token',
    schema: {
      oneOf: [
        { example: ERROR_TOKEN_EXPIRED_EXAMPLE },
        { example: ERROR_TOKEN_BLACKLISTED_EXAMPLE },
        { example: ERROR_UNAUTHORIZED_EXAMPLE },
      ],
    },
  })
  async refresh(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieve the authenticated user profile information. Requires JWT authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: GET_PROFILE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  async getProfile(@Request() req: any): Promise<UserProfileDto> {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * Logout user and blacklist tokens
   *
   * Requirements: 3.5
   * Task: 18.1
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout the authenticated user and blacklist their tokens. Optionally provide refresh token in x-refresh-token header to blacklist it as well.',
  })
  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Refresh token to blacklist (optional)',
    required: false,
    schema: {
      type: 'string',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: LOGOUT_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      example: ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  async logout(
    @Request() req: any,
    @Headers('authorization') authHeader?: string,
    @Headers('x-refresh-token') refreshToken?: string,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<any> {
    // Extract access token from Authorization header
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      throw new UnauthorizedException({
        message: {
          ar: 'رمز الوصول مطلوب',
          en: 'Access token required',
        },
        code: 'ACCESS_TOKEN_REQUIRED',
      });
    }

    return this.authService.logout(
      req.user.id,
      accessToken,
      refreshToken,
      ipAddress,
      userAgent,
    );
  }

  @Get('debug/user/:userId')
  @ApiOperation({
    summary: 'Debug user information',
    description: 'Get detailed user information for debugging purposes',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  async debugUser(@Param('userId') userId: string) {
    try {
      const user = await this.authService.getUserWithSubscriptionInfo(userId);
      return {
        success: true,
        message: 'User debug info retrieved',
        data: {
          userFromDatabase: user,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Debug failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}
