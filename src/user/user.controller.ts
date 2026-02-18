import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Logger,
  HttpException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { UserService } from './user.service';
import { UserDropdownService } from './user-dropdown.service';
import {
  CheckUserEntitiesDto,
  UserEntitiesResponseDto,
} from './dto/check-user-entities.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { DeactivateWithTransferDto } from './dto/deactivate-with-transfer.dto';
import { TransferAppointmentsDto } from './dto/transfer-appointments.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthService } from '../auth/auth.service';
import * as EXAMPLES from './constants/swagger-examples';
import * as crypto from 'crypto';
import { User } from '../database/schemas/user.schema';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  // Simple in-memory cache for dropdown results
  private dropdownCache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly userService: UserService,
    private readonly userDropdownService: UserDropdownService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'Get paginated list of users',
    description:
      'Retrieve a paginated list of users with filtering options. Requires admin, owner, or super_admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUsers(@Query() filterDto: GetUsersFilterDto) {
    try {
      const result = await this.userService.getUsers(filterDto);
      return {
        success: true,
        data: result,
        message: {
          ar: 'تم جلب قائمة المستخدمين بنجاح',
          en: 'Users list retrieved successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Get users list failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب قائمة المستخدمين',
            en: 'Failed to retrieve users list',
          },
          code: 'USERS_LIST_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Create a new user (admin, doctor, staff, etc.). Admin-initiated creation. Generates a temporary password if not provided. Requires admin, owner, or super_admin role.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    try {
      // Extract currentUserId from JWT payload
      const currentUserId = req.user?.id || req.user?.userId || req.user?.sub;
      const currentUserRole = req.user?.role;
      const currentUserEmail = req.user?.email;

      if (!currentUserId) {
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

      // Generate temporary password if not provided
      let isTemporary = false;
      let password = createUserDto.password;
      if (!password) {
        // Generate a secure random password: 12 characters, including upper, lower, digit, special
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const special = '@$!%*?&';

        const getRandomChar = (set: string) =>
          set[crypto.randomInt(0, set.length)];

        // Ensure at least one of each
        const passwordChars = [
          getRandomChar(upper),
          getRandomChar(lower),
          getRandomChar(digits),
          getRandomChar(special),
        ];

        // Fill the rest
        const all = upper + lower + digits + special;
        for (let i = 0; i < 8; i++) {
          passwordChars.push(getRandomChar(all));
        }

        // Shuffle
        for (let i = passwordChars.length - 1; i > 0; i--) {
          const j = crypto.randomInt(0, i + 1);
          [passwordChars[i], passwordChars[j]] = [
            passwordChars[j],
            passwordChars[i],
          ];
        }

        password = passwordChars.join('');
        createUserDto.password = password;
        isTemporary = true;
      }

      // Call authService.register with creator info
      const result = await this.authService.register(createUserDto as any, {
        id: currentUserId as string,
        role: currentUserRole,
        email: currentUserEmail as string,
      });

      // If password was temporary, mark it in the user record
      if (isTemporary) {
        await this.userService.updateUser(
          result.user.id,
          { temporaryPassword: true, isFirstLogin: true } as any,
          currentUserId as string,
        );
      }

      return {
        success: true,
        data: {
          ...result.user,
          temporaryPassword: isTemporary ? password : undefined,
        },
        message: {
          ar: 'تم إنشاء المستخدم بنجاح',
          en: 'User created successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Create user failed: ${error?.message}`, error?.stack);

      // Handle ConflictException from AuthService
      if (error?.status === HttpStatus.CONFLICT) {
        throw error;
      }

      throw new HttpException(
        {
          message: {
            ar: 'فشل إنشاء المستخدم',
            en: 'Failed to create user',
          },
          code: 'USER_CREATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the profile information of the currently authenticated user',
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
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      // Get complete user profile with populated relations
      const user = await this.userService.getUserDetailById(userId);

      return {
        success: true,
        data: {
          id: (user as any)._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          nationality: user.nationality,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          preferredLanguage: user.preferredLanguage,
          profilePictureUrl: user.profilePictureUrl,
          preferences: user.preferences,
          subscription: user.subscriptionId
            ? {
                id: (user.subscriptionId as any)._id.toString(),
                planType: (user.subscriptionId as any).planType,
              }
            : null,
          organization: user.organizationId
            ? {
                id: (user.organizationId as any)._id.toString(),
                name: (user.organizationId as any).name,
                nameAr: (user.organizationId as any).nameAr,
              }
            : null,
          complex: user.complexId
            ? {
                id: (user.complexId as any)._id.toString(),
                name: (user.complexId as any).name,
                nameAr: (user.complexId as any).nameAr,
              }
            : null,
          clinic: user.clinicId
            ? {
                id: (user.clinicId as any)._id.toString(),
                name: (user.clinicId as any).name,
                nameAr: (user.clinicId as any).nameAr,
              }
            : null,
          lastLogin: user.lastLogin,
          workingHours: (user as any).workingHours,
          createdAt: (user as any).createdAt,
          updatedAt: (user as any).updatedAt,
        },
        message: {
          ar: 'تم جلب بيانات المستخدم بنجاح',
          en: 'User profile retrieved successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get current user failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب بيانات المستخدم',
            en: 'Failed to retrieve user profile',
          },
          code: 'USER_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update the profile information of the currently authenticated user. Users can only update their own basic information (name, phone, nationality).',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'user@cliniva.com',
          firstName: 'Ahmed',
          lastName: 'Al-Mansour',
          phone: '+966506789012',
          nationality: 'Saudi Arabia',
        },
        message: {
          ar: 'تم تحديث الملف الشخصي بنجاح',
          en: 'Profile updated successfully',
        },
      },
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
  @ApiBearerAuth()
  @ApiBody({
    description: 'Profile update data (only basic fields allowed)',
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Ahmed' },
        lastName: { type: 'string', example: 'Al-Mansour' },
        phone: { type: 'string', example: '+966506789012' },
        nationality: { type: 'string', example: 'Saudi Arabia' },
      },
    },
  })
  @Put('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateCurrentUserProfile(
    @Body() updateData: UpdateOwnProfileDto,
    @Request() req: any,
  ) {
    try {
      // Get userId from JWT token
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      // Check if any fields were provided
      const hasFields = Object.keys(updateData).length > 0;
      if (!hasFields) {
        throw new HttpException(
          {
            message: {
              ar: 'لا توجد حقول صالحة للتحديث',
              en: 'No valid fields to update',
            },
            code: 'NO_VALID_FIELDS',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Handle email change separately (requires verification)
      if (updateData.email) {
        // Initiate email change with verification
        await this.authService.initiateEmailChange(userId, updateData.email);

        return {
          success: true,
          data: {
            emailChangeInitiated: true,
            newEmail: updateData.email,
          },
          message: {
            ar: 'تم إرسال رابط التحقق إلى البريد الإلكتروني الجديد',
            en: 'Verification link sent to new email',
          },
        };
      }

      // At this point, validation has already passed via the DTO
      // Only fields defined in UpdateOwnProfileDto can reach here
      const filteredData: Partial<UpdateUserDto> = {};

      // Copy validated fields
      if (updateData.firstName !== undefined)
        filteredData.firstName = updateData.firstName;
      if (updateData.lastName !== undefined)
        filteredData.lastName = updateData.lastName;
      if (updateData.phone !== undefined) filteredData.phone = updateData.phone;
      if (updateData.nationality !== undefined)
        filteredData.nationality = updateData.nationality;

      // Update user profile
      const updatedUser = await this.userService.updateUser(
        userId,
        filteredData,
        userId, // User is updating their own profile
      );

      return {
        success: true,
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          nationality: updatedUser.nationality,
        },
        message: {
          ar: 'تم تحديث الملف الشخصي بنجاح',
          en: 'Profile updated successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Update profile failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل تحديث الملف الشخصي',
            en: 'Failed to update profile',
          },
          code: 'PROFILE_UPDATE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({
    summary: 'Upload profile picture',
    description:
      'Upload a profile picture for the currently authenticated user. Only image files are allowed (JPEG, PNG, GIF, WebP, SVG). Maximum file size: 5MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
    schema: {
      example: {
        success: true,
        data: {
          profilePictureUrl: '/uploads/profiles/user-123.jpg',
        },
        message: {
          ar: 'تم رفع صورة الملف الشخصي بنجاح',
          en: 'Profile picture uploaded successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file type or size',
    schema: {
      example: {
        message: {
          ar: 'نوع الملف غير صالح. يجب أن تكون الصورة بصيغة JPEG أو PNG أو GIF أو WebP أو SVG',
          en: 'Invalid file type. Profile picture must be an image (JPEG, PNG, GIF, WebP, or SVG)',
        },
        code: 'INVALID_FILE_TYPE',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBearerAuth()
  @Post('me/profile-picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/profiles';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueName = `profile-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException({
              message: {
                ar: 'نوع الملف غير صالح. يجب أن تكون الصورة بصيغة JPEG أو PNG أو GIF أو WebP أو SVG',
                en: 'Invalid file type. Profile picture must be an image (JPEG, PNG, GIF, WebP, or SVG)',
              },
              code: 'INVALID_FILE_TYPE',
            }),
            false,
          );
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    try {
      if (!file) {
        throw new BadRequestException({
          message: {
            ar: 'لم يتم رفع أي ملف',
            en: 'No file uploaded',
          },
          code: 'NO_FILE_UPLOADED',
        });
      }

      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
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

      // Get current user to check for old profile picture
      const user = await this.userService.findById(userId);
      if (user && user.profilePictureUrl) {
        // Delete old profile picture if it exists
        const oldPath = `.${user.profilePictureUrl}`;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Store relative path
      const relativePath = `/uploads/profiles/${file.filename}`;

      // Update user profile with new picture URL
      await this.userService.updateUser(
        userId,
        { profilePictureUrl: relativePath },
        userId,
      );

      return {
        success: true,
        data: {
          profilePictureUrl: relativePath,
        },
        message: {
          ar: 'تم رفع صورة الملف الشخصي بنجاح',
          en: 'Profile picture uploaded successfully',
        },
      };
    } catch (error: any) {
      // Clean up uploaded file on error
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Upload profile picture failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل رفع صورة الملف الشخصي',
            en: 'Failed to upload profile picture',
          },
          code: 'PROFILE_PICTURE_UPLOAD_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({
    summary: 'Delete profile picture',
    description:
      'Delete the profile picture of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture deleted successfully',
    schema: {
      example: {
        success: true,
        message: {
          ar: 'تم حذف صورة الملف الشخصي بنجاح',
          en: 'Profile picture deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBearerAuth()
  @Delete('me/profile-picture')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteProfilePicture(@Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      if (!userId) {
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

      // Get current user to find profile picture
      const user = await this.userService.findById(userId);
      if (user && user.profilePictureUrl) {
        // Delete profile picture file
        const filePath = `.${user.profilePictureUrl}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Update user profile to remove picture URL
        await this.userService.updateUser(
          userId,
          { profilePictureUrl: undefined },
          userId,
        );
      }

      return {
        success: true,
        message: {
          ar: 'تم حذف صورة الملف الشخصي بنجاح',
          en: 'Profile picture deleted successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Delete profile picture failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل حذف صورة الملف الشخصي',
            en: 'Failed to delete profile picture',
          },
          code: 'PROFILE_PICTURE_DELETE_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({
    summary: 'Get current user login history',
    description:
      'Retrieve login history for the currently authenticated user including successful and failed login attempts',
  })
  @ApiResponse({
    status: 200,
    description: 'Login history retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          logins: [
            {
              timestamp: '2026-02-10T10:30:00.000Z',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
              success: true,
              eventType: 'login_success',
            },
            {
              timestamp: '2026-02-09T14:20:00.000Z',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
              success: false,
              eventType: 'login_failure',
              reason: 'Invalid password',
            },
          ],
          total: 2,
        },
        message: {
          ar: 'تم جلب سجل تسجيل الدخول بنجاح',
          en: 'Login history retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50, max: 100)',
    example: 50,
  })
  @ApiBearerAuth()
  @Get('me/login-history')
  @UseGuards(JwtAuthGuard)
  async getLoginHistory(@Request() req: any, @Query('limit') limit?: number) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      // Get login-related audit logs
      const loginLogs = await this.authService.getLoginHistory(
        userId,
        Math.min(limit || 50, 100),
      );

      return {
        success: true,
        data: {
          logins: loginLogs.map((log: any) => ({
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            success: log.success,
            eventType: log.eventType,
            reason: log.details?.reason,
          })),
          total: loginLogs.length,
        },
        message: {
          ar: 'تم جلب سجل تسجيل الدخول بنجاح',
          en: 'Login history retrieved successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get login history failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب سجل تسجيل الدخول',
            en: 'Failed to retrieve login history',
          },
          code: 'LOGIN_HISTORY_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({
    summary: 'Get current user activity log',
    description:
      'Retrieve activity log for the currently authenticated user including profile updates, password changes, and other important actions',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          activities: [
            {
              timestamp: '2026-02-10T11:00:00.000Z',
              eventType: 'password_change',
              action: 'Password changed',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
              details: {
                changeType: 'user_initiated',
              },
            },
            {
              timestamp: '2026-02-10T10:30:00.000Z',
              eventType: 'login_success',
              action: 'User logged in successfully',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
            },
          ],
          total: 2,
        },
        message: {
          ar: 'تم جلب سجل النشاط بنجاح',
          en: 'Activity log retrieved successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50, max: 100)',
    example: 50,
  })
  @ApiBearerAuth()
  @Get('me/activity-log')
  @UseGuards(JwtAuthGuard)
  async getActivityLog(@Request() req: any, @Query('limit') limit?: number) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      // Get all audit logs for the user
      const activityLogs = await this.authService.getUserActivityLog(
        userId,
        Math.min(limit || 50, 100),
      );

      return {
        success: true,
        data: {
          activities: activityLogs.map((log: any) => ({
            timestamp: log.timestamp,
            eventType: log.eventType,
            action:
              log.details?.action || this.getActionDescription(log.eventType),
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            details: log.details,
            success: log.success,
          })),
          total: activityLogs.length,
        },
        message: {
          ar: 'تم جلب سجل النشاط بنجاح',
          en: 'Activity log retrieved successfully',
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get activity log failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب سجل النشاط',
            en: 'Failed to retrieve activity log',
          },
          code: 'ACTIVITY_LOG_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper method to get action description from event type
   */
  private getActionDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      login_success: 'Logged in successfully',
      login_failure: 'Login attempt failed',
      logout: 'Logged out',
      password_change: 'Password changed',
      password_reset_request: 'Password reset requested',
      password_reset_complete: 'Password reset completed',
      session_invalidation: 'Sessions invalidated',
      email_change: 'Email changed',
      role_change: 'Role changed',
      user_status_change: 'Account status changed',
      user_updated: 'Profile updated',
    };

    return descriptions[eventType] || 'Activity recorded';
  }

  @ApiOperation({
    summary: 'Get current user preferences',
    description:
      'Retrieve preferences for the currently authenticated user including language, theme, and notification settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          language: 'ar',
          theme: 'dark',
          notifications: {
            email: true,
            sms: false,
            push: true,
            appointmentReminders: true,
            systemUpdates: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBearerAuth()
  @Get('me/preferences')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserPreferences(@Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      const preferences = await this.userService.getUserPreferences(userId);

      return {
        success: true,
        data: preferences,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get preferences failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب التفضيلات',
            en: 'Failed to retrieve preferences',
          },
          code: 'PREFERENCES_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({
    summary: 'Update current user preferences',
    description: 'Update preferences for the currently authenticated user',
  })
  @ApiBody({
    schema: {
      example: {
        language: 'ar',
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          push: true,
          appointmentReminders: true,
          systemUpdates: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          language: 'ar',
          theme: 'dark',
          notifications: {
            email: true,
            sms: false,
            push: true,
            appointmentReminders: true,
            systemUpdates: false,
          },
        },
        message: {
          ar: 'تم تحديث التفضيلات بنجاح',
          en: 'Preferences updated successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBearerAuth()
  @Put('me/preferences')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateCurrentUserPreferences(
    @Body() preferencesDto: any,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!userId) {
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

      return await this.userService.updateUserPreferences(
        userId,
        preferencesDto,
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Update preferences failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل تحديث التفضيلات',
            en: 'Failed to update preferences',
          },
          code: 'PREFERENCES_UPDATE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({
    summary: 'Check current user entities',
    description:
      'Check what entities (organization, complex, clinic) the current user has created based on their subscription plan',
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
    description:
      'Check what entities (organization, complex, clinic) a specific user has created based on their subscription plan',
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

  @ApiOperation({
    summary: 'Check user entities by ID (Alias)',
    description: 'Check what entities and appointments a specific user has. Alias for entities-status.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id/check-entities')
  @UseGuards(JwtAuthGuard)
  async checkUserEntitiesAlias(
    @Param('id') userId: string,
  ): Promise<UserEntitiesResponseDto> {
    return await this.userService.checkUserEntities(userId);
  }

  /**
   * Get user by ID
   *
   * Retrieves detailed information about a specific user by their ID.
   * Requires authentication and admin/owner/super_admin role.
   *
   * @param userId - User ID from route params
   * @returns User details with populated related entities
   */
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve detailed information about a specific user by their ID. Requires admin, owner, or super_admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      example: EXAMPLES.GET_USER_BY_ID_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid user ID format',
    schema: {
      example: {
        message: {
          ar: 'معرف المستخدم غير صالح',
          en: 'Invalid user ID format',
        },
        code: 'INVALID_USER_ID',
      },
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
    description: 'User ID (MongoDB ObjectId)',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') userId: string) {
    try {
      // Get user details with populated entities
      const user = await this.userService.getUserDetailById(userId);

      // Transform and return response
      return {
        success: true,
        data: {
          id: (user as any)._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          nationality: user.nationality,
          gender: user.gender,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          preferredLanguage: user.preferredLanguage,
          subscription: user.subscriptionId
            ? {
                id: (user.subscriptionId as any)._id.toString(),
                planType: (user.subscriptionId as any).planType,
              }
            : null,
          organization: user.organizationId
            ? {
                id: (user.organizationId as any)._id.toString(),
                name: (user.organizationId as any).name,
                nameAr: (user.organizationId as any).nameAr,
              }
            : null,
          complex: user.complexId
            ? {
                id: (user.complexId as any)._id.toString(),
                name: (user.complexId as any).name,
                nameAr: (user.complexId as any).nameAr,
              }
            : null,
          clinic: user.clinicId
            ? {
                id: (user.clinicId as any)._id.toString(),
                name: (user.clinicId as any).name,
                nameAr: (user.clinicId as any).nameAr,
              }
            : null,
          lastLogin: user.lastLogin,
          workingHours: (user as any).workingHours,
          createdAt: (user as any).createdAt,
          updatedAt: (user as any).updatedAt,
        },
        message: {
          ar: 'تم جلب بيانات المستخدم بنجاح',
          en: 'User retrieved successfully',
        },
      };
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get user by ID failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل جلب بيانات المستخدم',
            en: 'Failed to retrieve user data',
          },
          code: 'USER_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Update user status failed: ${error?.message}`,
        error?.stack,
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
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Deactivate doctor with transfer failed: ${error?.message}`,
        error?.stack,
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
   * Transfer appointments from one doctor to another
   * BZR-q0d8a9f1: Doctor appointment transfer on deactivation
   *
   * Task 10.3: Create appointment transfer endpoint
   * Requirements: 7.2, 7.3, 7.4, 7.6
   *
   * This endpoint allows administrators to transfer appointments from one doctor
   * to another without deactivating the source doctor. Useful for workload
   * redistribution or temporary coverage.
   *
   * @param doctorId - Source doctor ID from route params
   * @param transferDto - Transfer data with target doctor and appointment IDs
   * @param req - Request object containing authenticated admin user
   * @returns Success response with transfer results
   */
  @ApiOperation({
    summary: 'Transfer appointments between doctors',
    description:
      'Transfer specific appointments from one doctor to another. Validates target doctor exists and is active. Sends email notifications to affected patients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments transferred successfully',
    schema: {
      example: EXAMPLES.TRANSFER_APPOINTMENTS_RESPONSE_EXAMPLE,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transfer data',
    schema: {
      example: {
        message: {
          ar: 'بيانات النقل غير صالحة',
          en: 'Invalid transfer data',
        },
        code: 'INVALID_TRANSFER_DATA',
      },
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
    description: 'Doctor not found',
    schema: {
      example: EXAMPLES.ERROR_USER_NOT_FOUND_EXAMPLE,
    },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Source doctor ID',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: TransferAppointmentsDto,
    examples: {
      transfer: {
        summary: 'Transfer appointments',
        value: EXAMPLES.TRANSFER_APPOINTMENTS_REQUEST_EXAMPLE,
      },
    },
  })
  @Post(':id/transfer-appointments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async transferAppointments(
    @Param('id') doctorId: string,
    @Body() transferDto: TransferAppointmentsDto,
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

      // Call DoctorDeactivationService.transferAppointments()
      const result = await this.userService.transferAppointments(
        doctorId,
        transferDto.targetDoctorId,
        transferDto.appointmentIds,
        currentUserId,
      );

      // Get target doctor details for response
      const targetDoctor = await this.userService.findById(
        transferDto.targetDoctorId,
      );

      // Return success response with bilingual message
      return {
        success: true,
        data: {
          transferred: result.transferred,
          failed: result.failed,
          errors: result.errors,
          targetDoctor: targetDoctor
            ? {
                id: targetDoctor._id,
                firstName: targetDoctor.firstName,
                lastName: targetDoctor.lastName,
                email: targetDoctor.email,
              }
            : null,
        },
        message: {
          ar:
            result.failed === 0
              ? 'تم نقل المواعيد بنجاح'
              : 'تم نقل بعض المواعيد بنجاح',
          en:
            result.failed === 0
              ? 'Appointments transferred successfully'
              : 'Some appointments transferred successfully',
        },
      };
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Transfer appointments failed: ${error?.message}`,
        error?.stack,
      );
      throw new HttpException(
        {
          message: {
            ar: 'فشل نقل المواعيد',
            en: 'Failed to transfer appointments',
          },
          code: 'APPOINTMENT_TRANSFER_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get users for dropdown
   * BZR-q4f3e1b8: Deactivated user restrictions in dropdowns
   *
   * Task 11.2: Create user dropdown endpoint
   * Requirements: 10.1, 10.2
   * Design: Section 2.3 - User Dropdown Service
   *
   * This endpoint returns users for dropdown selection with optional filters.
   * By default, only active users are returned. Results are cached for 5 minutes.
   *
   * @param role - Optional role filter
   * @param complexId - Optional complex ID filter
   * @param clinicId - Optional clinic ID filter
   * @param includeDeactivated - Optional flag to include deactivated users
   * @returns List of users for dropdown
   */
  @ApiOperation({
    summary: 'Get users for dropdown',
    description:
      'Get users for dropdown selection with optional filters. Only returns active users by default. Results are cached for 5 minutes.',
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
  @ApiQuery({
    name: 'includeDeactivated',
    required: false,
    type: Boolean,
    description: 'Include deactivated users in results',
    example: false,
  })
  @Get('dropdown')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getUsersForDropdown(
    @Query('role') role?: string,
    @Query('complexId') complexId?: string,
    @Query('clinicId') clinicId?: string,
    @Query('includeDeactivated') includeDeactivated?: string,
  ) {
    try {
      // Parse includeDeactivated as boolean
      const includeDeactivatedBool = includeDeactivated === 'true';

      // Create cache key from query parameters
      const cacheKey = JSON.stringify({
        role,
        complexId,
        clinicId,
        includeDeactivated: includeDeactivatedBool,
      });

      // Check cache
      const cached = this.dropdownCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        this.logger.log('Returning cached dropdown results');
        return cached.data;
      }

      // Call UserDropdownService.getUsersForDropdown()
      const users = await this.userDropdownService.getUsersForDropdown({
        role,
        complexId,
        clinicId,
        includeDeactivated: includeDeactivatedBool,
      });

      // Build response
      const response = {
        success: true,
        data: users,
        message: {
          ar: 'تم جلب قائمة المستخدمين بنجاح',
          en: 'Users retrieved successfully',
        },
      };

      // Cache the result for 5 minutes
      this.dropdownCache.set(cacheKey, {
        data: response,
        timestamp: now,
      });

      // Clean up old cache entries (simple cleanup strategy)
      if (this.dropdownCache.size > 100) {
        const keysToDelete: string[] = [];
        this.dropdownCache.forEach((value, key) => {
          if (now - value.timestamp >= this.CACHE_TTL) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => this.dropdownCache.delete(key));
      }

      return response;
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Get users for dropdown failed: ${error?.message}`,
        error?.stack,
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
    @Request() req: any,
  ): Promise<{ success: boolean; message: { ar: string; en: string } }> {
    try {
      // Extract adminId from JWT payload (JWT strategy returns 'id')
      const adminId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!adminId) {
        this.logger.error('Admin ID not found in request', req.user);
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
    } catch (error: any) {
      // Handle errors with bilingual messages
      if (error?.response?.message) {
        throw error;
      }

      this.logger.error(
        `Send password reset failed: ${error?.message}`,
        error?.stack,
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
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data: any;
    message: { ar: string; en: string };
  }> {
    try {
      // Extract adminId from JWT payload (JWT strategy returns 'id')
      const adminId = req.user?.id || req.user?.userId || req.user?.sub;

      if (!adminId) {
        this.logger.error('Admin ID not found in request', req.user);
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
    } catch (error: any) {
      // Handle errors with bilingual messages
      if (error?.response?.message) {
        throw error;
      }

      this.logger.error(`Update user failed: ${error?.message}`, error?.stack);
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

  /**
   * Delete user
   * BZR-m3d5a8b7: Cannot delete own account
   *
   * Task 9.3: Add validation to user delete endpoint
   * Requirements: 9.1, 9.3, 9.4
   * Design: Section 2.1
   *
   * This endpoint allows administrators to delete a user.
   * It prevents users from deleting their own accounts and requires
   * the user to be deactivated before deletion.
   *
   * @param userId - User ID from route params
   * @param req - Request object containing authenticated admin user
   * @returns Success response with deleted user ID
   */
  @ApiOperation({
    summary: 'Delete user',
    description:
      'Delete a user. Cannot delete own account. User must be deactivated before deletion.',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      example: {
        success: true,
        data: {
          deletedUserId: '507f1f77bcf86cd799439011',
        },
        message: {
          ar: 'تم حذف المستخدم بنجاح',
          en: 'User deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User must be deactivated before deletion',
    schema: {
      example: {
        message: {
          ar: 'يجب إلغاء تفعيل المستخدم قبل الحذف',
          en: 'User must be deactivated before deletion',
        },
        code: 'USER_MUST_BE_DEACTIVATED',
      },
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
    description: 'Forbidden - Cannot delete own account',
    schema: {
      example: {
        message: {
          ar: 'لا يمكنك حذف حسابك الخاص',
          en: 'You cannot delete your own account',
        },
        code: 'CANNOT_DELETE_SELF',
      },
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
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') userId: string, @Request() req: any) {
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

      return await this.userService.deleteUser(
        userId,
        currentUserId,
        req.ip,
        req.headers['user-agent'],
      );
    } catch (error: any) {
      // Re-throw if already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Delete user failed: ${error?.message}`, error?.stack);
      throw new HttpException(
        {
          message: {
            ar: 'فشل حذف المستخدم',
            en: 'Failed to delete user',
          },
          code: 'USER_DELETE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
