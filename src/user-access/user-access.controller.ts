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
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
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
  SecurityAlertDto
} from './dto';

@Controller('user-access')
@UseGuards(JwtAuthGuard)
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  /**
   * Create user access record
   * POST /user-access
   */
  @Post()
  async createUserAccess(
    @Body(new ValidationPipe()) createUserAccessDto: CreateUserAccessDto,
    @Request() req: any
  ) {
    try {
      const userAccess = await this.userAccessService.createUserAccess(
        createUserAccessDto,
        req.user?.userId
      );

      return {
        success: true,
        message: 'User access created successfully',
        data: userAccess
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access records with filtering and pagination
   * GET /user-access
   */
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
          limit: parseInt(query.limit || '10')
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access record by ID
   * GET /user-access/:id
   */
  @Get(':id')
  async getUserAccessById(@Param('id') id: string) {
    try {
      const userAccess = await this.userAccessService.getUserAccessById(id);

      return {
        success: true,
        message: 'User access record retrieved successfully',
        data: userAccess
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update user access record
   * PUT /user-access/:id
   */
  @Put(':id')
  async updateUserAccess(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateUserAccessDto: UpdateUserAccessDto,
    @Request() req: any
  ) {
    try {
      const userAccess = await this.userAccessService.updateUserAccess(
        id,
        updateUserAccessDto,
        req.user?.userId
      );

      return {
        success: true,
        message: 'User access updated successfully',
        data: userAccess
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete user access record
   * DELETE /user-access/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUserAccess(
    @Param('id') id: string,
    @Request() req: any
  ) {
    try {
      await this.userAccessService.deleteUserAccess(id, req.user?.userId);

      return {
        success: true,
        message: 'User access deleted successfully'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access for specific user
   * GET /user-access/user/:userId
   */
  @Get('user/:userId')
  async getUserAccessForUser(@Param('userId') userId: string) {
    try {
      const userAccess = await this.userAccessService.getUserAccess(userId);

      return {
        success: true,
        message: 'User access records retrieved successfully',
        data: userAccess,
        count: userAccess.length
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access by scope
   * GET /user-access/scope/:scopeType/:scopeId
   */
  @Get('scope/:scopeType/:scopeId')
  async getUserAccessByScope(
    @Param('scopeType') scopeType: string,
    @Param('scopeId') scopeId: string,
    @Query() query: UserAccessSearchDto
  ) {
    try {
      const searchQuery = { ...query, scopeType, scopeId };
      const result = await this.userAccessService.getUserAccessList(searchQuery);

      return {
        success: true,
        message: `User access for ${scopeType} retrieved successfully`,
        data: result.userAccess,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Check user permission
   * POST /user-access/check-permission
   */
  @Post('check-permission')
  async checkPermission(@Body(new ValidationPipe()) checkPermissionDto: CheckPermissionDto) {
    try {
      const hasPermission = await this.userAccessService.checkPermission(checkPermissionDto);

      return {
        success: true,
        message: 'Permission check completed',
        data: {
          userId: checkPermissionDto.userId,
          permission: checkPermissionDto.permission,
          scopeType: checkPermissionDto.scopeType,
          scopeId: checkPermissionDto.scopeId,
          hasPermission
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Check multiple permissions
   * POST /user-access/check-permissions
   */
  @Post('check-permissions')
  async checkMultiplePermissions(
    @Body(new ValidationPipe()) checkPermissionsDto: CheckMultiplePermissionsDto
  ) {
    try {
      const result = await this.userAccessService.checkMultiplePermissions(checkPermissionsDto);

      return {
        success: true,
        message: 'Permission checks completed',
        data: {
          userId: checkPermissionsDto.userId,
          hasAccess: result.hasAccess,
          requirementType: checkPermissionsDto.requirementType || 'all',
          permissionResults: result.permissionResults
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Assign permissions to user
   * POST /user-access/assign-permissions
   */
  @Post('assign-permissions')
  async assignPermissions(
    @Body(new ValidationPipe()) assignPermissionsDto: AssignPermissionsDto,
    @Request() req: any
  ) {
    try {
      await this.userAccessService.assignPermissions(assignPermissionsDto, req.user?.userId);

      return {
        success: true,
        message: 'Permissions assigned successfully',
        data: {
          userId: assignPermissionsDto.userId,
          permissions: assignPermissionsDto.permissions,
          scopeType: assignPermissionsDto.scopeType,
          scopeId: assignPermissionsDto.scopeId
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Revoke permissions from user
   * POST /user-access/revoke-permissions
   */
  @Post('revoke-permissions')
  async revokePermissions(
    @Body(new ValidationPipe()) revokePermissionsDto: RevokePermissionsDto,
    @Request() req: any
  ) {
    try {
      await this.userAccessService.revokePermissions(revokePermissionsDto, req.user?.userId);

      return {
        success: true,
        message: 'Permissions revoked successfully',
        data: {
          userId: revokePermissionsDto.userId,
          permissions: revokePermissionsDto.permissions,
          scopeType: revokePermissionsDto.scopeType,
          scopeId: revokePermissionsDto.scopeId,
          reason: revokePermissionsDto.reason
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Validate user entity access
   * GET /user-access/validate/:userId/:entityType/:entityId
   */
  @Get('validate/:userId/:entityType/:entityId')
  async validateEntityAccess(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    try {
      const canAccess = await this.userAccessService.validateUserCanAccessEntity(
        userId,
        entityType,
        entityId
      );

      return {
        success: true,
        message: 'Entity access validation completed',
        data: {
          userId,
          entityType,
          entityId,
          canAccess
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Bulk user access operations
   * POST /user-access/bulk-action
   */
  @Post('bulk-action')
  async bulkUserAccessAction(
    @Body(new ValidationPipe()) bulkUserAccessDto: BulkUserAccessDto,
    @Request() req: any
  ) {
    try {
      const result = await this.userAccessService.bulkUserAccessAction(
        bulkUserAccessDto,
        req.user?.userId
      );

      return {
        success: true,
        message: `Bulk ${bulkUserAccessDto.action} completed`,
        data: {
          action: bulkUserAccessDto.action,
          totalUsers: bulkUserAccessDto.userIds.length,
          successful: result.success,
          failed: result.failed,
          errors: result.errors
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user access statistics
   * GET /user-access/stats/overview
   */
  @Get('stats/overview')
  async getUserAccessStats() {
    try {
      const stats = await this.userAccessService.getUserAccessStats();

      return {
        success: true,
        message: 'User access statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get security statistics
   * GET /user-access/stats/security
   */
  @Get('stats/security')
  async getSecurityStats() {
    try {
      const stats = await this.userAccessService.getSecurityStats();

      return {
        success: true,
        message: 'Security statistics retrieved successfully',
        data: stats
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
  @Post('logs')
  async createAccessLog(@Body(new ValidationPipe()) createAccessLogDto: CreateAccessLogDto) {
    try {
      const accessLog = await this.userAccessService.createAccessLog(createAccessLogDto);

      return {
        success: true,
        message: 'Access log created successfully',
        data: accessLog
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get access logs with filtering
   * GET /user-access/logs
   */
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
          limit: parseInt(query.limit || '20')
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get access logs for specific user
   * GET /user-access/logs/user/:userId
   */
  @Get('logs/user/:userId')
  async getUserAccessLogs(
    @Param('userId') userId: string,
    @Query() query: AccessLogSearchDto
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
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get recent access logs (last 24 hours)
   * GET /user-access/logs/recent
   */
  @Get('logs/recent')
  async getRecentAccessLogs(@Query('limit') limit?: string) {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const query: AccessLogSearchDto = {
        dateFrom: yesterday.toISOString(),
        dateTo: now.toISOString(),
        limit: limit || '50',
        sortOrder: 'desc'
      };

      const result = await this.userAccessService.getAccessLogs(query);

      return {
        success: true,
        message: 'Recent access logs retrieved successfully',
        data: result.logs,
        count: result.logs.length,
        timeRange: {
          from: yesterday,
          to: now
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get failed login attempts
   * GET /user-access/logs/failed-logins
   */
  @Get('logs/failed-logins')
  async getFailedLogins(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = { 
        ...query, 
        eventTypes: ['failed_login'],
        sortOrder: 'desc' as 'desc'
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Failed login attempts retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get suspicious activities
   * GET /user-access/logs/suspicious
   */
  @Get('logs/suspicious')
  async getSuspiciousActivities(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = { 
        ...query, 
        eventTypes: ['suspicious_activity'],
        sortOrder: 'desc' as 'desc'
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Suspicious activities retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get high-risk access logs
   * GET /user-access/logs/high-risk
   */
  @Get('logs/high-risk')
  async getHighRiskAccess(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = { 
        ...query, 
        riskLevel: 'high',
        sortOrder: 'desc' as 'desc'
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'High-risk access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get flagged access logs
   * GET /user-access/logs/flagged
   */
  @Get('logs/flagged')
  async getFlaggedAccessLogs(@Query() query: AccessLogSearchDto) {
    try {
      const searchQuery = { 
        ...query, 
        flaggedForReview: true,
        sortOrder: 'desc' as 'desc'
      };
      const result = await this.userAccessService.getAccessLogs(searchQuery);

      return {
        success: true,
        message: 'Flagged access logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
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
            days: daysCount
          }
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user activity timeline
   * GET /user-access/timeline/:userId
   */
  @Get('timeline/:userId')
  async getUserActivityTimeline(
    @Param('userId') userId: string,
    @Query('days') days?: string
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
        sortOrder: 'desc'
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
            days: daysCount
          }
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Export access data
   * GET /user-access/export
   */
  @Get('export')
  async exportAccessData(
    @Query('format') format?: string,
    @Query() query?: AccessLogSearchDto
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
          query
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 