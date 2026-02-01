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
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FirstLoginGuard, SkipFirstLoginCheck } from './guards/first-login.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthResponseDto,
  UserProfileDto,
  FirstLoginPasswordChangeDto,
  ChangePasswordDto,
} from './dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Login user
   * 
   * Task 12.1: Extract IP address and user agent for audit logging
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    loginDto: LoginDto,
    @Request() req,
  ): Promise<AuthResponseDto> {
    // Extract IP address from request
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Extract user agent from request headers
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return this.authService.login(loginDto, ipAddress, userAgent);
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
  async firstLoginPasswordChange(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: FirstLoginPasswordChangeDto,
    @Request() req,
  ): Promise<AuthResponseDto> {
    try {
      // Extract userId from JWT payload (populated by JwtAuthGuard)
      const userId = req.user?.userId || req.user?.sub;

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

      this.logger.error(`First login password change failed: ${error.message}`, error.stack);
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
   * Requirements: 8.2, 8.6, 8.8
   * 
   * This endpoint allows authenticated users to change their password.
   * It applies both JwtAuthGuard and FirstLoginGuard to ensure:
   * 1. User is authenticated (JwtAuthGuard)
   * 2. User has completed first login password change (FirstLoginGuard)
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard, FirstLoginGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: ChangePasswordDto,
    @Request() req,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Extract userId from JWT payload (populated by JwtAuthGuard)
      const userId = req.user?.userId || req.user?.sub;

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

      this.logger.error(`Password change failed: ${error.message}`, error.stack);
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
   * Requirements: 8.3, 8.6, 8.9
   * 
   * This is a public endpoint (no guards) that allows users to request a password reset.
   * It extracts the IP address from the request for rate limiting and audit logging.
   * Returns the same response whether the email exists or not for security.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: { email: string },
    @Request() req,
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

      this.logger.error(`Forgot password request failed: ${error.message}`, error.stack);
      
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
  async resetPassword(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: { token: string; newPassword: string; confirmPassword: string },
    @Request() req,
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
  async getProfile(@Request() req): Promise<UserProfileDto> {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * Logout user (optional endpoint for client-side token removal)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<{ message: string }> {
    // Since we're using stateless JWT, we don't need to do anything server-side
    // The client should remove the token from storage
    return { message: 'Successfully logged out' };
  }

  @Get('debug/user/:userId')
  async debugUser(@Param('userId') userId: string) {
    try {
      const user = await this.authService.getUserWithSubscriptionInfo(userId);
      return {
        success: true,
        message: 'User debug info retrieved',
        data: {
          userFromDatabase: user,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Debug failed: ${error.message}`,
        error: error.message
      };
    }
  }
}




