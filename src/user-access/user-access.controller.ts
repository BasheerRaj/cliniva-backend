import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserAccessService } from './user-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateUserAccessDto,
  UpdateUserAccessDto,
  UserAccessSearchDto,
  CreateAccessLogDto,
  AccessLogSearchDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
  CheckPermissionDto,
  CheckMultiplePermissionsDto,
  BulkUserAccessDto,
} from './dto';
import { USER_ACCESS_SWAGGER_EXAMPLES } from './constants/swagger-examples';
import { ERROR_EXAMPLES } from '../common/examples/common-responses';

@ApiTags('User Access & RBAC')
@Controller('user-access')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  /**
   * Create user access record
   * POST /user-access
   */
  @ApiOperation({
    summary: 'Create user access record',
    description: 'Creates a new user access record with role and permissions for a specific scope (organization, complex, department, or clinic). Requires authentication and appropriate permissions.',
  })
  @ApiResponse({
    status: 201,
    description: 'User access created successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.CREATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or bad request',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User or scope entity not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.SCOPE_NOT_FOUND,
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User access already exists',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.ALREADY_EXISTS,
    },
  })
  @ApiBody({ type: CreateUserAccessDto })
  @Post()
  async createUserAccess(
    @Body(new ValidationPipe()) createUserAccessDto: CreateUserAccessDto,
    @Request() req: any,
  ) {
    try {
      const userAccess = await this.userAccessService.createUserAccess(
        createUserAccessDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: 'User access created successfully',
        data: userAccess,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access records with filtering and pagination
   * GET /user-access
   */
  @ApiOperation({
    summary: 'List user access records',
    description: 'Retrieves a paginated list of user access records with optional filtering by user, scope, role, permissions, and status. Supports search across user names and emails.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access records retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.LIST_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search across user names and emails' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'scopeType', required: false, enum: ['organization', 'complex', 'department', 'clinic'], description: 'Filter by scope type' })
  @ApiQuery({ name: 'scopeId', required: false, type: String, description: 'Filter by scope ID' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'isExpired', required: false, type: Boolean, description: 'Filter by expiration status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @Get()
  async getUserAccess(@Query() query: UserAccessSearchDto) {
    try {
      const result = await this.userAccessService.getUserAccessList(query);

      return {
        success: true,
        message: 'User access records retrieved successfully',
        data: result.userAccess,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '10'),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access record by ID
   * GET /user-access/:id
   */
  @ApiOperation({
    summary: 'Get user access by ID',
    description: 'Retrieves a single user access record by its unique identifier. Includes populated user and granter information.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access record retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ID format',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User access not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiParam({ name: 'id', description: 'User access record ID', type: String })
  @Get(':id')
  async getUserAccessById(@Param('id') id: string) {
    try {
      const userAccess = await this.userAccessService.getUserAccessById(id);

      return {
        success: true,
        message: 'User access record retrieved successfully',
        data: userAccess,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update user access record
   * PUT /user-access/:id
   */
  @ApiOperation({
    summary: 'Update user access',
    description: 'Updates an existing user access record. Can modify role, custom permissions, expiration date, notes, and active status.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access updated successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.UPDATE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or bad request',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User access not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiParam({ name: 'id', description: 'User access record ID', type: String })
  @ApiBody({ type: UpdateUserAccessDto })
  @Put(':id')
  async updateUserAccess(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateUserAccessDto: UpdateUserAccessDto,
    @Request() req: any,
  ) {
    try {
      const userAccess = await this.userAccessService.updateUserAccess(
        id,
        updateUserAccessDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: 'User access updated successfully',
        data: userAccess,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete user access record
   * DELETE /user-access/:id
   */
  @ApiOperation({
    summary: 'Delete user access',
    description: 'Permanently deletes a user access record. This revokes all permissions for the user in the specified scope.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access deleted successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.DELETE_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ID format',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User access not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiParam({ name: 'id', description: 'User access record ID', type: String })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUserAccess(@Param('id') id: string, @Request() req: any) {
    try {
      await this.userAccessService.deleteUserAccess(id, req.user?.userId);

      return {
        success: true,
        message: 'User access deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access for specific user
   * GET /user-access/user/:userId
   */
  @ApiOperation({
    summary: 'Get user access for specific user',
    description: 'Retrieves all access records for a specific user across all scopes. Returns a list of all organizations, complexes, departments, and clinics the user has access to.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access records retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User access records retrieved successfully',
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            scopeType: 'clinic',
            scopeId: '507f1f77bcf86cd799439013',
            role: 'admin',
            isActive: true,
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user ID',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiParam({ name: 'userId', description: 'User ID to get access records for', type: String })
  @Get('user/:userId')
  async getUserAccessForUser(@Param('userId') userId: string) {
    try {
      const userAccess = await this.userAccessService.getUserAccess(userId);

      return {
        success: true,
        message: 'User access records retrieved successfully',
        data: userAccess,
        count: userAccess.length,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access by scope
   * GET /user-access/scope/:scopeType/:scopeId
   */
  @ApiOperation({
    summary: 'Get user access by scope',
    description: 'Retrieves all user access records for a specific scope (organization, complex, department, or clinic). Useful for viewing all users who have access to a particular entity.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access records for scope retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User access for clinic retrieved successfully',
        data: [
          {
            _id: '507f1f77bcf86cd799439011',
            userId: {
              _id: '507f1f77bcf86cd799439012',
              firstName: 'Ahmed',
              lastName: 'Ali',
            },
            role: 'admin',
            isActive: true,
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid scope parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiParam({ name: 'scopeType', enum: ['organization', 'complex', 'department', 'clinic'], description: 'Type of scope entity' })
  @ApiParam({ name: 'scopeId', description: 'Scope entity ID', type: String })
  @Get('scope/:scopeType/:scopeId')
  async getUserAccessByScope(
    @Param('scopeType') scopeType: string,
    @Param('scopeId') scopeId: string,
    @Query() query: UserAccessSearchDto,
  ) {
    try {
      const searchQuery = { ...query, scopeType, scopeId };
      const result =
        await this.userAccessService.getUserAccessList(searchQuery);

      return {
        success: true,
        message: `User access for ${scopeType} retrieved successfully`,
        data: result.userAccess,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Check user permission
   * POST /user-access/check-permission
   */
  @ApiOperation({
    summary: 'Check user permission',
    description: 'Checks if a user has a specific permission in a given scope. Returns true if the user has the permission either through their role or custom permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.CHECK_PERMISSION_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBody({ type: CheckPermissionDto })
  @Post('check-permission')
  async checkPermission(
    @Body(new ValidationPipe()) checkPermissionDto: CheckPermissionDto,
  ) {
    try {
      const hasPermission =
        await this.userAccessService.checkPermission(checkPermissionDto);

      return {
        success: true,
        message: 'Permission check completed',
        data: {
          userId: checkPermissionDto.userId,
          permission: checkPermissionDto.permission,
          scopeType: checkPermissionDto.scopeType,
          scopeId: checkPermissionDto.scopeId,
          hasPermission,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Check multiple permissions
   * POST /user-access/check-permissions
   */
  @ApiOperation({
    summary: 'Check multiple permissions',
    description: 'Checks if a user has multiple permissions in a given scope. Can require all permissions (AND logic) or any permission (OR logic) based on requirementType.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission checks completed',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.CHECK_MULTIPLE_PERMISSIONS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBody({ type: CheckMultiplePermissionsDto })
  @Post('check-permissions')
  async checkMultiplePermissions(
    @Body(new ValidationPipe())
    checkPermissionsDto: CheckMultiplePermissionsDto,
  ) {
    try {
      const result =
        await this.userAccessService.checkMultiplePermissions(
          checkPermissionsDto,
        );

      return {
        success: true,
        message: 'Permission checks completed',
        data: {
          userId: checkPermissionsDto.userId,
          hasAccess: result.hasAccess,
          requirementType: checkPermissionsDto.requirementType || 'all',
          permissionResults: result.permissionResults,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Assign permissions to user
   * POST /user-access/assign-permissions
   */
  @ApiOperation({
    summary: 'Assign permissions to user',
    description: 'Assigns additional custom permissions to a user in a specific scope. These permissions are added to the user\'s existing role-based permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.ASSIGN_PERMISSIONS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User access not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBody({ type: AssignPermissionsDto })
  @Post('assign-permissions')
  async assignPermissions(
    @Body(new ValidationPipe()) assignPermissionsDto: AssignPermissionsDto,
    @Request() req: any,
  ) {
    try {
      await this.userAccessService.assignPermissions(
        assignPermissionsDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: 'Permissions assigned successfully',
        data: {
          userId: assignPermissionsDto.userId,
          permissions: assignPermissionsDto.permissions,
          scopeType: assignPermissionsDto.scopeType,
          scopeId: assignPermissionsDto.scopeId,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Revoke permissions from user
   * POST /user-access/revoke-permissions
   */
  @ApiOperation({
    summary: 'Revoke permissions from user',
    description: 'Revokes specific custom permissions from a user in a given scope. Requires a reason for audit purposes. Role-based permissions cannot be revoked this way.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions revoked successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.REVOKE_PERMISSIONS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User access not found',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.NOT_FOUND,
    },
  })
  @ApiBody({ type: RevokePermissionsDto })
  @Post('revoke-permissions')
  async revokePermissions(
    @Body(new ValidationPipe()) revokePermissionsDto: RevokePermissionsDto,
    @Request() req: any,
  ) {
    try {
      await this.userAccessService.revokePermissions(
        revokePermissionsDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: 'Permissions revoked successfully',
        data: {
          userId: revokePermissionsDto.userId,
          permissions: revokePermissionsDto.permissions,
          scopeType: revokePermissionsDto.scopeType,
          scopeId: revokePermissionsDto.scopeId,
          reason: revokePermissionsDto.reason,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Validate user entity access
   * GET /user-access/validate/:userId/:entityType/:entityId
   */
  @ApiOperation({
    summary: 'Validate user entity access',
    description: 'Validates if a user can access a specific entity (organization, complex, department, or clinic). Checks hierarchical access permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Entity access validation completed',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATE_ACCESS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiParam({ name: 'userId', description: 'User ID to validate', type: String })
  @ApiParam({ name: 'entityType', enum: ['organization', 'complex', 'department', 'clinic'], description: 'Type of entity' })
  @ApiParam({ name: 'entityId', description: 'Entity ID', type: String })
  @Get('validate/:userId/:entityType/:entityId')
  async validateEntityAccess(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    try {
      const canAccess =
        await this.userAccessService.validateUserCanAccessEntity(
          userId,
          entityType,
          entityId,
        );

      return {
        success: true,
        message: 'Entity access validation completed',
        data: {
          userId,
          entityType,
          entityId,
          canAccess,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Bulk user access operations
   * POST /user-access/bulk-action
   */
  @ApiOperation({
    summary: 'Bulk user access operations',
    description: 'Performs bulk operations on multiple users: grant access, revoke access, update roles, activate, or deactivate. Returns success/failure count for each operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.BULK_ACTION_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.INSUFFICIENT_PERMISSIONS,
    },
  })
  @ApiBody({ type: BulkUserAccessDto })
  @Post('bulk-action')
  async bulkUserAccessAction(
    @Body(new ValidationPipe()) bulkUserAccessDto: BulkUserAccessDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.userAccessService.bulkUserAccessAction(
        bulkUserAccessDto,
        req.user?.userId,
      );

      return {
        success: true,
        message: `Bulk ${bulkUserAccessDto.action} completed`,
        data: {
          action: bulkUserAccessDto.action,
          totalUsers: bulkUserAccessDto.userIds.length,
          successful: result.success,
          failed: result.failed,
          errors: result.errors,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access statistics
   * GET /user-access/stats/overview
   */
  @ApiOperation({
    summary: 'Get user access statistics',
    description: 'Retrieves comprehensive statistics about user access including total users, active users, role distribution, scope distribution, and recent changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access statistics retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.USER_ACCESS_STATS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('stats/overview')
  async getUserAccessStats() {
    try {
      const stats = await this.userAccessService.getUserAccessStats();

      return {
        success: true,
        message: 'User access statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get security statistics
   * GET /user-access/stats/security
   */
  @ApiOperation({
    summary: 'Get security statistics',
    description: 'Retrieves security-related statistics including login attempts, failed logins, suspicious activities, risk distribution, and device/browser statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Security statistics retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.SECURITY_STATS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('stats/security')
  async getSecurityStats() {
    try {
      const stats = await this.userAccessService.getSecurityStats();

      return {
        success: true,
        message: 'Security statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Access Logging Endpoints

  /**
   * Create access log entry
   * POST /user-access/logs
   */
  @ApiOperation({
    summary: 'Create access log entry',
    description: 'Creates a new access log entry for tracking user activities, login attempts, permission checks, and security events.',
  })
  @ApiResponse({
    status: 201,
    description: 'Access log created successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.CREATE_LOG_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiBody({ type: CreateAccessLogDto })
  @Post('logs')
  async createAccessLog(
    @Body(new ValidationPipe()) createAccessLogDto: CreateAccessLogDto,
  ) {
    try {
      const accessLog =
        await this.userAccessService.createAccessLog(createAccessLogDto);

      return {
        success: true,
        message: 'Access log created successfully',
        data: accessLog,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get access logs with filtering
   * GET /user-access/logs
   */
  @ApiOperation({
    summary: 'Get access logs with filtering',
    description: 'Retrieves access logs with comprehensive filtering options including user, event type, IP address, status, risk level, and date range. Supports pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Access logs retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'eventTypes', required: false, type: [String], description: 'Filter by event types' })
  @ApiQuery({ name: 'ipAddress', required: false, type: String, description: 'Filter by IP address' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'failure', 'blocked', 'warning'], description: 'Filter by status' })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['low', 'medium', 'high', 'critical'], description: 'Filter by risk level' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Items per page' })
  @Get('logs')
  async getAccessLogs(@Query() query: AccessLogSearchDto) {
    try {
      const result = await this.userAccessService.getAccessLogs(query);

      return {
        success: true,
        message: 'Access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: parseInt(query.limit || '20'),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get access logs for specific user
   * GET /user-access/logs/user/:userId
   */
  @ApiOperation({
    summary: 'Get access logs for specific user',
    description: 'Retrieves all access logs for a specific user with optional filtering and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'User access logs retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user ID',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiParam({ name: 'userId', description: 'User ID to get logs for', type: String })
  @Get('logs/user/:userId')
  async getUserAccessLogs(
    @Param('userId') userId: string,
    @Query() query: AccessLogSearchDto,
  ) {
    try {
      const searchQuery = { ...query, userId };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'User access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get recent access logs (last 24 hours)
   * GET /user-access/logs/recent
   */
  @ApiOperation({
    summary: 'Get recent access logs',
    description: 'Retrieves access logs from the last 24 hours. Useful for monitoring recent activity and security events.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent access logs retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.RECENT_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Maximum number of logs to return (default: 50)' })
  @Get('logs/recent')
  async getRecentAccessLogs(@Query('limit') limit?: string) {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const query: AccessLogSearchDto = {
        dateFrom: yesterday.toISOString(),
        dateTo: now.toISOString(),
        limit: limit || '50',
        sortOrder: 'desc',
      };

      const result = await this.userAccessService.getAccessLogs(query);

      return {
        success: true,
        message: 'Recent access logs retrieved successfully',
        data: result.logs,
        count: result.logs.length,
        timeRange: {
          from: yesterday,
          to: now,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get failed login attempts
   * GET /user-access/logs/failed-logins
   */
  @ApiOperation({
    summary: 'Get failed login attempts',
    description: 'Retrieves all failed login attempts. Critical for security monitoring and detecting potential brute force attacks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed login attempts retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('logs/failed-logins')
  async getFailedLogins(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = {
        ...query,
        eventTypes: ['failed_login'],
        sortOrder: 'desc' as const,
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Failed login attempts retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get suspicious activities
   * GET /user-access/logs/suspicious
   */
  @ApiOperation({
    summary: 'Get suspicious activities',
    description: 'Retrieves all access logs flagged as suspicious activities. Requires immediate security review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspicious activities retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('logs/suspicious')
  async getSuspiciousActivities(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = {
        ...query,
        eventTypes: ['suspicious_activity'],
        sortOrder: 'desc' as const,
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Suspicious activities retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get high-risk access logs
   * GET /user-access/logs/high-risk
   */
  @ApiOperation({
    summary: 'Get high-risk access logs',
    description: 'Retrieves all access logs with high risk level. These events require security team attention.',
  })
  @ApiResponse({
    status: 200,
    description: 'High-risk access logs retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('logs/high-risk')
  async getHighRiskAccess(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = {
        ...query,
        riskLevel: 'high',
        sortOrder: 'desc' as const,
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'High-risk access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get flagged access logs
   * GET /user-access/logs/flagged
   */
  @ApiOperation({
    summary: 'Get flagged access logs',
    description: 'Retrieves all access logs that have been flagged for manual review by security team.',
  })
  @ApiResponse({
    status: 200,
    description: 'Flagged access logs retrieved successfully',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.GET_LOGS_SUCCESS,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @Get('logs/flagged')
  async getFlaggedAccessLogs(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = {
        ...query,
        flaggedForReview: true,
        sortOrder: 'desc' as const,
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Flagged access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Analytics and Reporting Endpoints

  /**
   * Get access patterns analytics
   * GET /user-access/analytics/patterns
   */
  @ApiOperation({
    summary: 'Get access patterns analytics',
    description: 'Analyzes user access patterns over a specified time period. Helps identify trends, anomalies, and usage patterns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Access patterns retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Access patterns retrieved successfully',
        data: {
          analysisNote: 'Access pattern analysis would be implemented here',
          dateRange: {
            from: '2026-01-08T10:00:00.000Z',
            to: '2026-02-07T10:00:00.000Z',
            days: 30,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiQuery({ name: 'days', required: false, type: String, description: 'Number of days to analyze (default: 30)' })
  @Get('analytics/patterns')
  async getAccessPatterns(@Query('days') days?: string) {
    try {
      const daysCount = parseInt(days || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);

      // This would implement pattern analysis
      return {
        success: true,
        message: 'Access patterns retrieved successfully',
        data: {
          analysisNote: 'Access pattern analysis would be implemented here',
          dateRange: {
            from: startDate,
            to: new Date(),
            days: daysCount,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user activity timeline
   * GET /user-access/timeline/:userId
   */
  @ApiOperation({
    summary: 'Get user activity timeline',
    description: 'Retrieves a chronological timeline of all activities for a specific user over a specified period. Useful for user behavior analysis and audit trails.',
  })
  @ApiResponse({
    status: 200,
    description: 'User activity timeline retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User activity timeline retrieved successfully',
        data: {
          userId: '507f1f77bcf86cd799439012',
          timeline: [
            {
              _id: '507f1f77bcf86cd799439020',
              eventType: 'login',
              ipAddress: '192.168.1.100',
              status: 'success',
              createdAt: '2026-02-07T10:00:00.000Z',
            },
          ],
          dateRange: {
            from: '2026-01-31T10:00:00.000Z',
            to: '2026-02-07T10:00:00.000Z',
            days: 7,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user ID',
    schema: {
      example: USER_ACCESS_SWAGGER_EXAMPLES.VALIDATION_ERROR,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiParam({ name: 'userId', description: 'User ID to get timeline for', type: String })
  @ApiQuery({ name: 'days', required: false, type: String, description: 'Number of days to include (default: 7)' })
  @Get('timeline/:userId')
  async getUserActivityTimeline(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ) {
    try {
      const daysCount = parseInt(days || '7');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);

      const query: AccessLogSearchDto = {
        userId,
        dateFrom: startDate.toISOString(),
        dateTo: new Date().toISOString(),
        limit: '100',
        sortOrder: 'desc',
      };

      const result = await this.userAccessService.getAccessLogs(query);

      return {
        success: true,
        message: 'User activity timeline retrieved successfully',
        data: {
          userId,
          timeline: result.logs,
          dateRange: {
            from: startDate,
            to: new Date(),
            days: daysCount,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Export access data
   * GET /user-access/export
   */
  @ApiOperation({
    summary: 'Export access data',
    description: 'Exports access data in various formats (JSON, CSV, Excel) for reporting and compliance purposes. Supports filtering similar to the logs endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Access data export prepared',
    schema: {
      example: {
        success: true,
        message: 'Access data export prepared (json format)',
        data: {
          exportNote: 'Data export functionality would be implemented here',
          format: 'json',
          query: {},
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      example: ERROR_EXAMPLES.UNAUTHORIZED,
    },
  })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'excel'], description: 'Export format (default: json)' })
  @Get('export')
  async exportAccessData(
    @Query('format') format?: string,
    @Query() query?: AccessLogSearchDto,
  ) {
    try {
      const exportFormat = format || 'json';

      // This would implement data export in various formats
      return {
        success: true,
        message: `Access data export prepared (${exportFormat} format)`,
        data: {
          exportNote: 'Data export functionality would be implemented here',
          format: exportFormat,
          query,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
