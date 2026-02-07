import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CheckUserEntitiesDto,
  UserEntitiesResponseDto,
} from './dto/check-user-entities.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { DeactivateWithTransferDto } from './dto/deactivate-with-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthService } from '../auth/auth.service';
import * as EXAMPLES from './constants/swagger-examples';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile information of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: EXAMPLES.USER_DETAIL_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any) {
    console.log('🔍 JWT User from request:', req.user);
    return { user: req.user, message: 'Authentication working!' };
  }

  @ApiOperation({
    summary: 'Check current user entities',
    description: 'Check what entities (organization, complex, clinic) the current user has created based on their subscription plan',
  })
  @ApiResponse({
    status: 200,
    description: 'User entities status retrieved successfully',
    type: UserEntitiesResponseDto,
    schema: {
      example: EXAMPLES.CHECK_USER_ENTITIES_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @Post('check-entities')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkCurrentUserEntities(
    @Request() req: any,
  ): Promise<UserEntitiesResponseDto> {
    // Get userId from JWT token - the strategy returns user.id
    const userId = req.user.id;
    console.log('🔍 JWT User from request:', req.user);
    console.log('🎯 Using userId:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @ApiOperation({
    summary: 'Check user entities by ID',
    description: 'Check what entities (organization, complex, clinic) a specific user has created based on their subscription plan',
  })
  @ApiResponse({
    status: 200,
    description: 'User entities status retrieved successfully',
    type: UserEntitiesResponseDto,
    schema: {
      example: EXAMPLES.CHECK_USER_ENTITIES_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiBody({ type: CheckUserEntitiesDto })
  @Post('check-entities-by-id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async checkUserEntities(
    @Body() checkUserEntitiesDto: CheckUserEntitiesDto,
  ): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(
      checkUserEntitiesDto.userId,
    );
  }

  @ApiOperation({
    summary: 'Get current user entities status',
    description: 'Get the entities status for the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User entities status retrieved successfully',
    type: UserEntitiesResponseDto,
    schema: {
      example: EXAMPLES.CHECK_USER_ENTITIES_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @Get('entities-status')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserEntitiesStatus(
    @Request() req: any,
  ): Promise<UserEntitiesResponseDto> {
    // Get userId from JWT token
    const userId = req.user.id;
    console.log('🔍 Getting entities status for user:', userId);
    return await this.userService.checkUserEntities(userId);
  }

  @ApiOperation({
    summary: 'Get user entities status by ID',
    description: 'Get the entities status for a specific user by their ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User entities status retrieved successfully',
    type: UserEntitiesResponseDto,
    schema: {
      example: EXAMPLES.CHECK_USER_ENTITIES_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id/entities-status')
  @UseGuards(JwtAuthGuard)
  async getUserEntitiesStatus(
    @Param('id') userId: string,
  ): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(userId);
  }

  /**
   * Update user status
   * BZR-n0c4e9f2: Cannot deactivate own account
   *
   * Task 7.1: Add updateUserStatus endpoint to UserController
   * Requirements: 3.1
   * Design: Section 3.6.1
   *
   * This endpoint allows administrators to activate or deactivate a user.
   * It prevents users from deactivating their own accounts.
   *
   * @param userId - User ID from route params
   * @param updateStatusDto - Status update data
   * @param req - Request object containing authenticated admin user
   * @returns Success response with updated user
   */
  @ApiOperation({
    summary: 'Update user status',
    description:
      'Activate or deactivate a user. Cannot deactivate own account. Deactivating a user will invalidate all their active sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    schema: {
      example: EXAMPLES.UPDATE_USER_STATUS_DEACTIVATE_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot deactivate own account',
    schema: {
      example: EXAMPLES.ERROR_CANNOT_DEACTIVATE_SELF_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateUserStatusDto })
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    try {
      // Extract currentUserId from JWT payload
      const currentUserId = req.user?.userId || req.user?.sub || req.user?.id;

      if (!currentUserId) {
        this.logger.error('User ID not found in request');
        throw new HttpException(
          {
            message: {
              ar: 'معرف المستخدم غير موجود',
              en: 'User ID not found',
            },
            code: 'USER_ID_NOT_FOUND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.userService.updateUserStatus(
        userId,
        updateStatusDto,
        currentUserId,
        req.ip,
        req.headers['user-agent'],
      );
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Update user status failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل تحديث حالة المستخدم',
            en: 'Failed to update user status',
          },
          code: 'USER_STATUS_UPDATE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Deactivate doctor with appointment transfer
   * BZR-q0d8a9f1: Doctor appointment transfer on deactivation
   *
   * Task 7.2: Add deactivateDoctorWithTransfer endpoint to UserController
   * Requirements: 3.3
   * Design: Section 3.6.1
   *
   * This endpoint allows administrators to deactivate a doctor and transfer
   * their appointments to another doctor or mark them for rescheduling.
   *
   * @param doctorId - Doctor ID from route params
   * @param transferDto - Transfer configuration data
   * @param req - Request object containing authenticated admin user
   * @returns Success response with transfer details
   */
  @ApiOperation({
    summary: 'Deactivate doctor with appointment transfer',
    description:
      'Deactivate a doctor and transfer their appointments to another doctor or mark for rescheduling. Cannot deactivate own account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor deactivated and appointments transferred',
    schema: {
      example: EXAMPLES.DEACTIVATE_DOCTOR_TRANSFER_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transfer data or doctor has appointments',
    schema: {
      example: EXAMPLES.ERROR_DOCTOR_HAS_APPOINTMENTS_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot deactivate own account',
    schema: {
      example: EXAMPLES.ERROR_CANNOT_DEACTIVATE_SELF_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Doctor ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: DeactivateWithTransferDto })
  @Post(':id/deactivate-with-transfer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deactivateDoctorWithTransfer(
    @Param('id') doctorId: string,
    @Body() transferDto: DeactivateWithTransferDto,
    @Request() req: any,
  ) {
    try {
      // Extract currentUserId from JWT payload
      const currentUserId = req.user?.userId || req.user?.sub || req.user?.id;

      if (!currentUserId) {
        this.logger.error('User ID not found in request');
        throw new HttpException(
          {
            message: {
              ar: 'معرف المستخدم غير موجود',
              en: 'User ID not found',
            },
            code: 'USER_ID_NOT_FOUND',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.userService.deactivateDoctorWithTransfer(
        doctorId,
        transferDto,
        currentUserId,
        req.ip,
        req.headers['user-agent'],
      );
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Deactivate doctor with transfer failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل إلغاء تفعيل الطبيب مع نقل المواعيد',
            en: 'Failed to deactivate doctor with appointment transfer',
          },
          code: 'DOCTOR_DEACTIVATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get users for dropdown
   * BZR-q4f3e1b8: Deactivated user restrictions in dropdowns
   *
   * Task 7.3: Add getUsersForDropdown endpoint to UserController
   * Requirements: 3.2
   * Design: Section 3.6.1
   *
   * This endpoint returns only active users for dropdown selection,
   * with optional filtering by role, complex, and clinic.
   *
   * @param role - Optional role filter
   * @param complexId - Optional complex ID filter
   * @param clinicId - Optional clinic ID filter
   * @returns List of active users
   */
  @ApiOperation({
    summary: 'Get users for dropdown',
    description:
      'Get active users for dropdown selection with optional filters. Only returns active users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: EXAMPLES.USERS_DROPDOWN_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
    example: 'doctor',
  })
  @ApiQuery({
    name: 'complexId',
    required: false,
    type: String,
    description: 'Filter by complex ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    type: String,
    description: 'Filter by clinic ID',
    example: '507f1f77bcf86cd799439014',
  })
  @Get('dropdown')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getUsersForDropdown(
    @Query('role') role?: string,
    @Query('complexId') complexId?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    try {
      return await this.userService.getUsersForDropdown({
        role,
        complexId,
        clinicId,
      });
    } catch (error) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get users for dropdown failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب قائمة المستخدمين',
            en: 'Failed to retrieve users list',
          },
          code: 'USERS_DROPDOWN_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
  @ApiOperation({
    summary: 'Send password reset email',
    description:
      'Admin-initiated password reset email. Sends a password reset link to the specified user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
    schema: {
      example: EXAMPLES.SEND_PASSWORD_RESET_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EXAMPLES.ERROR_FORBIDDEN_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
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

  /**
   * Update user information
   *
   * Task 17.1: Add session invalidation to user update operations
   * Requirements: 3.1, 3.2, 3.8
   *
   * This endpoint allows administrators to update user information.
   * When email or role is changed, all user sessions are automatically invalidated
   * and the user receives a notification email.
   *
   * @param userId - User ID from route params
   * @param updateUserDto - Update data
   * @param req - Request object containing authenticated admin user
   * @returns Updated user with success message
   */
  @ApiOperation({
    summary: 'Update user information',
    description:
      'Update user information. Changing email or role will invalidate all user sessions and send notification email.',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: EXAMPLES.UPDATE_USER_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: EXAMPLES.ERROR_VALIDATION_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: EXAMPLES.ERROR_UNAUTHORIZED_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: EXAMPLES.ERROR_FORBIDDEN_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: EXAMPLES.ERROR_EMAIL_ALREADY_EXISTS_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateUserDto })
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: any;
    message: { ar: string; en: string };
  }> {
    try {
      // Extract adminId from JWT payload
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

      // Call UserService.updateUser
      const updatedUser = await this.userService.updateUser(
        userId,
        updateUserDto,
        adminId,
      );

      // Return success response with bilingual message
      return {
        success: true,
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          phone: updatedUser.phone,
          preferredLanguage: updatedUser.preferredLanguage,
        },
        message: {
          ar: 'تم تحديث المستخدم بنجاح',
          en: 'User updated successfully',
        },
      };
    } catch (error) {
      // Handle errors with bilingual messages
      if (error.response?.message) {
        throw error;
      }

      this.logger.error(`Update user failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          message: {
            ar: 'فشل تحديث المستخدم',
            en: 'Failed to update user',
          },
          code: 'USER_UPDATE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
