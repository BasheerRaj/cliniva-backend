import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserAccess } from '../database/schemas/user-access.schema';
import { AccessLog } from '../database/schemas/access-log.schema';
import { User } from '../database/schemas/user.schema';
import { Organization } from '../database/schemas/organization.schema';
import { Complex } from '../database/schemas/complex.schema';
import { Clinic } from '../database/schemas/clinic.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { PermissionsEnum, DefaultRolePermissions } from '../common/enums/permissions.enum';
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
  SecurityAlertDto,
  UserAccessStatsDto,
  SecurityStatsDto,
  AccessAuditDto
} from './dto';

@Injectable()
export class UserAccessService {
  private readonly logger = new Logger(UserAccessService.name);

  constructor(
    @InjectModel('UserAccess') private readonly userAccessModel: Model<UserAccess>,
    @InjectModel('AccessLog') private readonly accessLogModel: Model<AccessLog>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Organization') private readonly organizationModel: Model<Organization>,
    @InjectModel('Complex') private readonly complexModel: Model<Complex>,
    @InjectModel('Clinic') private readonly clinicModel: Model<Clinic>,
  ) {}

  // User Access CRUD Operations

  /**
   * Create user access record
   */
  async createUserAccess(
    createAccessDto: CreateUserAccessDto,
    createdByUserId?: string
  ): Promise<UserAccess> {
    this.logger.log(`Creating user access for user: ${createAccessDto.userId}`);

    // Validate user exists
    const user = await this.userModel.findById(createAccessDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate scope entity exists
    await this.validateScopeEntity(createAccessDto.scopeType, createAccessDto.scopeId);

    // Check for duplicate access
    const existingAccess = await this.userAccessModel.findOne({
      userId: new Types.ObjectId(createAccessDto.userId),
      scopeType: createAccessDto.scopeType,
      scopeId: new Types.ObjectId(createAccessDto.scopeId),
      role: createAccessDto.role
    });

    if (existingAccess) {
      throw new ConflictException('User already has this access level for this scope');
    }

    const accessData = {
      userId: new Types.ObjectId(createAccessDto.userId),
      scopeType: createAccessDto.scopeType,
      scopeId: new Types.ObjectId(createAccessDto.scopeId),
      role: createAccessDto.role,
      customPermissions: createAccessDto.customPermissions || [],
      expiresAt: createAccessDto.expiresAt ? new Date(createAccessDto.expiresAt) : undefined,
      notes: createAccessDto.notes,
      isActive: true,
      grantedBy: createdByUserId ? new Types.ObjectId(createdByUserId) : undefined,
      grantedAt: new Date()
    };

    const userAccess = new this.userAccessModel(accessData);
    const savedAccess = await userAccess.save();

    // Log the access grant
    await this.createAccessLog({
      userId: createAccessDto.userId,
      eventType: 'role_change',
      ipAddress: '127.0.0.1', // Would be passed from request
      status: 'success',
      notes: `Access granted: ${createAccessDto.role} for ${createAccessDto.scopeType}`
    });

    this.logger.log(`User access created successfully for user: ${createAccessDto.userId}`);
    return savedAccess;
  }

  /**
   * Get user access records
   */
  async getUserAccessList(query: UserAccessSearchDto): Promise<{
    userAccess: UserAccess[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      userId,
      scopeType,
      scopeId,
      role,
      hasPermissions,
      isActive,
      isExpired,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build filter
    const filter: any = {};

    if (userId) filter.userId = new Types.ObjectId(userId);
    if (scopeType) filter.scopeType = scopeType;
    if (scopeId) filter.scopeId = new Types.ObjectId(scopeId);
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;

    // Handle expiration filter
    if (isExpired !== undefined) {
      const now = new Date();
      if (isExpired) {
        filter.expiresAt = { $lt: now };
      } else {
        filter.$or = [
          { expiresAt: { $gte: now } },
          { expiresAt: { $exists: false } }
        ];
      }
    }

    // Handle permissions filter
    if (hasPermissions && hasPermissions.length > 0) {
      filter.customPermissions = { $in: hasPermissions };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [userAccess, total] = await Promise.all([
      this.userAccessModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('grantedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.userAccessModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Add search functionality across populated user data
    let filteredAccess = userAccess;
    if (search) {
      filteredAccess = userAccess.filter(access => {
        const user = access.userId as any;
        const searchTerm = search.toLowerCase();
        return (
          user.firstName?.toLowerCase().includes(searchTerm) ||
          user.lastName?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm) ||
          access.role.toLowerCase().includes(searchTerm) ||
          access.scopeType.toLowerCase().includes(searchTerm)
        );
      });
    }

    return {
      userAccess: filteredAccess,
      total,
      page: pageNum,
      totalPages
    };
  }

  /**
   * Get user access by ID
   */
  async getUserAccessById(accessId: string): Promise<UserAccess> {
    if (!Types.ObjectId.isValid(accessId)) {
      throw new BadRequestException('Invalid access ID format');
    }

    const userAccess = await this.userAccessModel
      .findById(accessId)
      .populate('userId', 'firstName lastName email role')
      .populate('grantedBy', 'firstName lastName')
      .exec();

    if (!userAccess) {
      throw new NotFoundException('User access record not found');
    }

    return userAccess;
  }

  /**
   * Update user access
   */
  async updateUserAccess(
    accessId: string,
    updateAccessDto: UpdateUserAccessDto,
    updatedByUserId?: string
  ): Promise<UserAccess> {
    if (!Types.ObjectId.isValid(accessId)) {
      throw new BadRequestException('Invalid access ID format');
    }

    this.logger.log(`Updating user access: ${accessId}`);

    const updateData: any = {
      ...updateAccessDto,
      expiresAt: updateAccessDto.expiresAt ? new Date(updateAccessDto.expiresAt) : undefined,
      updatedBy: updatedByUserId ? new Types.ObjectId(updatedByUserId) : undefined,
      updatedAt: new Date()
    };

    const userAccess = await this.userAccessModel
      .findByIdAndUpdate(accessId, { $set: updateData }, { new: true, runValidators: true })
      .populate('userId', 'firstName lastName email')
      .exec();

    if (!userAccess) {
      throw new NotFoundException('User access record not found');
    }

    // Log the access change
    await this.createAccessLog({
      userId: (userAccess.userId as any)._id.toString(),
      eventType: 'role_change',
      ipAddress: '127.0.0.1',
      status: 'success',
      notes: `Access updated by ${updatedByUserId}`
    });

    this.logger.log(`User access updated successfully: ${accessId}`);
    return userAccess;
  }

  /**
   * Delete user access
   */
  async deleteUserAccess(accessId: string, deletedByUserId?: string): Promise<void> {
    if (!Types.ObjectId.isValid(accessId)) {
      throw new BadRequestException('Invalid access ID format');
    }

    this.logger.log(`Deleting user access: ${accessId}`);

    const userAccess = await this.userAccessModel.findById(accessId);
    if (!userAccess) {
      throw new NotFoundException('User access record not found');
    }

    await this.userAccessModel.findByIdAndDelete(accessId);

    // Log the access revocation
    await this.createAccessLog({
      userId: userAccess.userId.toString(),
      eventType: 'role_change',
      ipAddress: '127.0.0.1',
      status: 'success',
      notes: `Access revoked by ${deletedByUserId}`
    });

    this.logger.log(`User access deleted successfully: ${accessId}`);
  }

  // Legacy method for onboarding compatibility
  async createUserAccessLegacy(userId: string, scopeType: string, scopeId: string, role: UserRole): Promise<UserAccess> {
    return await this.createUserAccess({
      userId,
      scopeType,
      scopeId,
      role
    } as CreateUserAccessDto);
  }

  // Legacy method for backward compatibility
  async getUserAccess(userId: string): Promise<UserAccess[]> {
    const result = await this.getUserAccessList({ userId });
    return result.userAccess;
  }

  // Permission Management

  /**
   * Check if user has specific permission
   */
  async checkPermission(checkDto: CheckPermissionDto): Promise<boolean> {
    const userAccess = await this.userAccessModel
      .findOne({
        userId: new Types.ObjectId(checkDto.userId),
        scopeType: checkDto.scopeType,
        scopeId: new Types.ObjectId(checkDto.scopeId),
        isActive: true
      })
      .exec();

    if (!userAccess) {
      return false;
    }

    // Check if permission is in custom permissions
    if (userAccess.customPermissions && userAccess.customPermissions.includes(checkDto.permission)) {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = DefaultRolePermissions[userAccess.role] || [];
    return rolePermissions.includes(checkDto.permission);
  }

  /**
   * Check multiple permissions
   */
  async checkMultiplePermissions(checkDto: CheckMultiplePermissionsDto): Promise<{
    hasAccess: boolean;
    permissionResults: Array<{ permission: PermissionsEnum; granted: boolean }>;
  }> {
    const permissionResults = await Promise.all(
      checkDto.permissions.map(async permission => ({
        permission,
        granted: await this.checkPermission({
          userId: checkDto.userId,
          permission,
          scopeType: checkDto.scopeType,
          scopeId: checkDto.scopeId
        })
      }))
    );

    const hasAccess = checkDto.requirementType === 'all' 
      ? permissionResults.every(result => result.granted)
      : permissionResults.some(result => result.granted);

    return {
      hasAccess,
      permissionResults
    };
  }

  /**
   * Assign custom permissions
   */
  async assignPermissions(assignDto: AssignPermissionsDto, assignedByUserId?: string): Promise<void> {
    const userAccess = await this.userAccessModel.findOne({
      userId: new Types.ObjectId(assignDto.userId),
      scopeType: assignDto.scopeType,
      scopeId: new Types.ObjectId(assignDto.scopeId)
    });

    if (!userAccess) {
      throw new NotFoundException('User access record not found');
    }

    // Add new permissions (avoid duplicates)
    const existingPermissions = userAccess.customPermissions || [];
    const newPermissions = [...new Set([...existingPermissions, ...assignDto.permissions])];

    await this.userAccessModel.findByIdAndUpdate(userAccess._id, {
      $set: {
        customPermissions: newPermissions,
        expiresAt: assignDto.expiresAt ? new Date(assignDto.expiresAt) : userAccess.expiresAt
      }
    });

    // Log permission assignment
    await this.createAccessLog({
      userId: assignDto.userId,
      eventType: 'permission_denied', // Would be 'permission_granted' with proper event types
      ipAddress: '127.0.0.1',
      status: 'success',
      notes: `Permissions assigned: ${assignDto.permissions.join(', ')}`
    });

    this.logger.log(`Permissions assigned to user ${assignDto.userId}: ${assignDto.permissions.join(', ')}`);
  }

  /**
   * Revoke permissions
   */
  async revokePermissions(revokeDto: RevokePermissionsDto, revokedByUserId?: string): Promise<void> {
    const userAccess = await this.userAccessModel.findOne({
      userId: new Types.ObjectId(revokeDto.userId),
      scopeType: revokeDto.scopeType,
      scopeId: new Types.ObjectId(revokeDto.scopeId)
    });

    if (!userAccess) {
      throw new NotFoundException('User access record not found');
    }

    // Remove specified permissions
    const existingPermissions = userAccess.customPermissions || [];
    const remainingPermissions = existingPermissions.filter(
      permission => !revokeDto.permissions.includes(permission)
    );

    await this.userAccessModel.findByIdAndUpdate(userAccess._id, {
      $set: { customPermissions: remainingPermissions }
    });

    // Log permission revocation
    await this.createAccessLog({
      userId: revokeDto.userId,
      eventType: 'permission_denied',
      ipAddress: '127.0.0.1',
      status: 'success',
      notes: `Permissions revoked: ${revokeDto.permissions.join(', ')}. Reason: ${revokeDto.reason}`
    });

    this.logger.log(`Permissions revoked from user ${revokeDto.userId}: ${revokeDto.permissions.join(', ')}`);
  }

  // Access Logging

  /**
   * Create access log entry
   */
  async createAccessLog(createLogDto: CreateAccessLogDto): Promise<AccessLog> {
    const logData = {
      ...createLogDto,
      userId: new Types.ObjectId(createLogDto.userId),
      organizationId: createLogDto.organizationId ? new Types.ObjectId(createLogDto.organizationId) : undefined,
      clinicId: createLogDto.clinicId ? new Types.ObjectId(createLogDto.clinicId) : undefined,
      riskLevel: createLogDto.riskLevel || 'low',
      flaggedForReview: (createLogDto.riskScore && createLogDto.riskScore > 70) || false
    };

    const accessLog = new this.accessLogModel(logData);
    return await accessLog.save();
  }

  /**
   * Get access logs
   */
  async getAccessLogs(query: AccessLogSearchDto): Promise<{
    logs: AccessLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      userId,
      eventTypes,
      ipAddress,
      sessionId,
      status,
      resource,
      riskLevel,
      flaggedForReview,
      dateFrom,
      dateTo,
      organizationId,
      clinicId,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build filter
    const filter: any = {};

    if (userId) filter.userId = new Types.ObjectId(userId);
    if (eventTypes && eventTypes.length > 0) filter.eventType = { $in: eventTypes };
    if (ipAddress) filter.ipAddress = ipAddress;
    if (sessionId) filter.sessionId = sessionId;
    if (status) filter.status = status;
    if (resource) filter.resource = new RegExp(resource, 'i');
    if (riskLevel) filter.riskLevel = riskLevel;
    if (flaggedForReview !== undefined) filter.flaggedForReview = flaggedForReview;
    if (organizationId) filter.organizationId = new Types.ObjectId(organizationId);
    if (clinicId) filter.clinicId = new Types.ObjectId(clinicId);

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [logs, total] = await Promise.all([
      this.accessLogModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.accessLogModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      logs,
      total,
      page: pageNum,
      totalPages
    };
  }

  // Bulk Operations

  /**
   * Bulk user access operations
   */
  async bulkUserAccessAction(
    bulkDto: BulkUserAccessDto,
    actionByUserId?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { userIds, action, scopeType, scopeId, role, permissions, reason } = bulkDto;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        switch (action) {
          case 'grant':
            if (!scopeType || !scopeId || !role) {
              throw new BadRequestException('Scope type, scope ID, and role are required for grant action');
            }
            await this.createUserAccess({
              userId,
              scopeType,
              scopeId,
              role,
              customPermissions: permissions
            } as CreateUserAccessDto, actionByUserId);
            break;

          case 'revoke':
            const accessRecords = await this.userAccessModel.find({ userId: new Types.ObjectId(userId) });
            for (const access of accessRecords) {
              await this.deleteUserAccess((access as any)._id.toString(), actionByUserId);
            }
            break;

          case 'update_role':
            if (!role) {
              throw new BadRequestException('Role is required for update_role action');
            }
            await this.userAccessModel.updateMany(
              { userId: new Types.ObjectId(userId) },
              { $set: { role } }
            );
            break;

          case 'activate':
            await this.userAccessModel.updateMany(
              { userId: new Types.ObjectId(userId) },
              { $set: { isActive: true } }
            );
            break;

          case 'deactivate':
            await this.userAccessModel.updateMany(
              { userId: new Types.ObjectId(userId) },
              { $set: { isActive: false } }
            );
            break;
        }
        success++;
      } catch (error) {
        failed++;
        errors.push(`User ${userId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  // Analytics and Statistics

  /**
   * Get user access statistics
   */
  async getUserAccessStats(): Promise<UserAccessStatsDto> {
    const [
      totalUsersWithAccess,
      activeUsers,
      usersWithExpiredAccess,
      usersByRole,
      usersByScope,
      recentAccessChanges
    ] = await Promise.all([
      this.userAccessModel.countDocuments({}),
      this.userAccessModel.countDocuments({ isActive: true }),
      this.userAccessModel.countDocuments({
        expiresAt: { $lt: new Date() }
      }),
      this.userAccessModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      this.userAccessModel.aggregate([
        { $group: { _id: '$scopeType', count: { $sum: 1 } } }
      ]),
      this.accessLogModel
        .find({ eventType: 'role_change' })
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec()
    ]);

    return {
      totalUsersWithAccess,
      activeUsers,
      usersWithExpiredAccess,
      usersByRole: usersByRole.map(item => ({
        role: item._id,
        count: item.count,
        percentage: Math.round((item.count / totalUsersWithAccess) * 100)
      })),
      usersByScope: usersByScope.map(item => ({
        scopeType: item._id,
        count: item.count
      })),
      recentAccessChanges: recentAccessChanges.map(change => ({
        userId: change.userId.toString(),
        userName: `${(change.userId as any).firstName} ${(change.userId as any).lastName}`,
        changeType: 'role_change',
        timestamp: change.createdAt || new Date()
      })),
      accessByPermission: [], // Would implement if needed
      securityAlerts: [], // Would implement with proper security alert system
      loginTrends: [], // Would implement with daily/weekly trends
      topActiveUsers: [] // Would implement with activity tracking
    };
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<SecurityStatsDto> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalAccessLogs,
      loginAttempts,
      failedLogins,
      suspiciousActivities,
      riskDistribution
    ] = await Promise.all([
      this.accessLogModel.countDocuments({}),
      this.accessLogModel.countDocuments({
        eventType: { $in: ['login', 'failed_login'] },
        createdAt: { $gte: last24Hours }
      }),
      this.accessLogModel.countDocuments({
        eventType: 'failed_login',
        createdAt: { $gte: last24Hours }
      }),
      this.accessLogModel.countDocuments({
        eventType: 'suspicious_activity',
        createdAt: { $gte: last24Hours }
      }),
      this.accessLogModel.aggregate([
        {
          $group: {
            _id: '$riskLevel',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      totalAccessLogs,
      loginAttempts,
      failedLogins,
      suspiciousActivities,
      blockedAttempts: 0, // Would implement with proper blocking system
      uniqueIpAddresses: 0, // Would implement with distinct IP count
      riskDistribution: riskDistribution.map(item => ({
        riskLevel: item._id,
        count: item.count,
        percentage: Math.round((item.count / totalAccessLogs) * 100)
      })),
      topRiskyUsers: [], // Would implement with user risk scoring
      accessByTimeOfDay: [], // Would implement with hourly analysis
      accessByLocation: [], // Would implement with geolocation
      deviceStats: [], // Would implement with device analysis
      browserStats: [] // Would implement with user agent analysis
    };
  }

  // Legacy Methods for Backward Compatibility

  async setupUserAccessForOnboarding(userId: string, planType: string, entities: any): Promise<void> {
    const role = UserRole.OWNER;

    switch (planType.toLowerCase()) {
      case 'company':
        if (entities.organization) {
          await this.createUserAccess({
            userId,
            scopeType: 'organization',
            scopeId: entities.organization._id.toString(),
            role
          } as CreateUserAccessDto);
        }
        
        if (entities.complexes) {
          for (const complex of entities.complexes) {
            await this.createUserAccess({
              userId,
              scopeType: 'complex',
              scopeId: complex._id.toString(),
              role
            } as CreateUserAccessDto);
          }
        }

        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess({
              userId,
              scopeType: 'clinic',
              scopeId: clinic._id.toString(),
              role
            } as CreateUserAccessDto);
          }
        }
        break;

      case 'complex':
        if (entities.complexes) {
          for (const complex of entities.complexes) {
            await this.createUserAccess({
              userId,
              scopeType: 'complex',
              scopeId: complex._id.toString(),
              role
            } as CreateUserAccessDto);
          }
        }

        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess({
              userId,
              scopeType: 'clinic',
              scopeId: clinic._id.toString(),
              role
            } as CreateUserAccessDto);
          }
        }
        break;

      case 'clinic':
        if (entities.clinics) {
          for (const clinic of entities.clinics) {
            await this.createUserAccess({
              userId,
              scopeType: 'clinic',
              scopeId: clinic._id.toString(),
              role
            } as CreateUserAccessDto);
          }
        }
        break;
    }
  }

  async validateUserCanAccessEntity(userId: string, entityType: string, entityId: string): Promise<boolean> {
    const access = await this.userAccessModel.findOne({
      userId: new Types.ObjectId(userId),
      scopeType: entityType,
      scopeId: new Types.ObjectId(entityId),
      isActive: true
    });

    return !!access;
  }

  // Helper Methods

  private async validateScopeEntity(scopeType: string, scopeId: string): Promise<void> {
    let entity = null;

    switch (scopeType) {
      case 'organization':
        entity = await this.organizationModel.findById(scopeId);
        break;
      case 'complex':
        entity = await this.complexModel.findById(scopeId);
        break;
      case 'clinic':
        entity = await this.clinicModel.findById(scopeId);
        break;
      case 'department':
        // Would check department model if it exists
        return;
    }

    if (!entity) {
      throw new NotFoundException(`${scopeType} not found`);
    }
  }
}
