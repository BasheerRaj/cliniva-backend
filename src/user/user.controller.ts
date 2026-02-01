import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus, Request, Logger, HttpException } from '@nestjs/common';
import { UserService } from './user.service';
import { CheckUserEntitiesDto, UserEntitiesResponseDto } from './dto/check-user-entities.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any) {
    console.log('🔍 JWT User from request:', req.user);
    return { user: req.user, message: 'Authentication working!' };
  }

  @Post('check-entities')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkCurrentUserEntities(@Request() req: any): Promise<UserEntitiesResponseDto> {
    // Get userId from JWT token - the strategy returns user.id
    const userId = req.user.id;
    console.log('🔍 JWT User from request:', req.user);
    console.log('🎯 Using userId:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @Post('check-entities-by-id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkUserEntities(@Body() checkUserEntitiesDto: CheckUserEntitiesDto): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(checkUserEntitiesDto.userId);
  }

  @Get('entities-status')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserEntitiesStatus(@Request() req: any): Promise<UserEntitiesResponseDto> {
    // Get userId from JWT token
    const userId = req.user.id;
    console.log('🔍 Getting entities status for user:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @Get(':id/entities-status')
  @UseGuards(JwtAuthGuard)
  async getUserEntitiesStatus(@Param('id') userId: string): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(userId);
  }

  /**
   * Send password reset email (admin-initiated)
   * 
   * Task 16.1: Create POST /users/:id/send-password-reset endpoint
   * Requirements: 8.5, 8.8
   * 
   * This endpoint allows administrators to send a password reset email to a user.
   * It applies both JwtAuthGuard and AdminGuard to ensure:
   * 1. User is authenticated (JwtAuthGuard)
   * 2. User has admin, owner, or super_admin role (AdminGuard)
   * 
   * @param userId - User ID from route params
   * @param req - Request object containing authenticated admin user
   * @returns Success response with bilingual message
   */
  @Post(':id/send-password-reset')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async sendPasswordReset(
    @Param('id') userId: string,
    @Request() req,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Extract adminId from JWT payload (populated by JwtAuthGuard)
      const adminId = req.user?.userId || req.user?.sub;

      if (!adminId) {
        this.logger.error('Admin ID not found in request');
        throw new HttpException(
          {
            message: {
              ar: 'معرف المسؤول غير موجود',
              en: 'Admin ID not found',
            },
            code: 'ADMIN_ID_NOT_FOUND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Call AuthService.sendPasswordResetEmail(userId, adminId)
      const result = await this.authService.sendPasswordResetEmail(
        userId,
        adminId,
      );

      // Return SuccessResponse
      return result;
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(
        `Send password reset failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل إرسال رسالة إعادة تعيين كلمة المرور',
            en: 'Failed to send password reset email',
          },
          code: 'PASSWORD_RESET_EMAIL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
