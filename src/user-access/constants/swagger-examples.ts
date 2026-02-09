/**
 * User Access Module - Swagger Examples
 *
 * Example objects for Swagger/OpenAPI documentation.
 * Demonstrates request/response formats for user access and RBAC endpoints.
 *
 * @module user-access/constants/swagger-examples
 */

import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionsEnum } from '../../common/enums/permissions.enum';

/**
 * User Access Success Examples
 */
export const USER_ACCESS_SUCCESS_EXAMPLES = {
  /**
   * User access created successfully
   */
  CREATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
      role: UserRole.ADMIN,
      customPermissions: [
        PermissionsEnum.USER_READ,
        PermissionsEnum.USER_CREATE,
      ],
      isActive: true,
      grantedBy: '507f1f77bcf86cd799439014',
      grantedAt: '2026-02-07T10:00:00.000Z',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء صلاحية الوصول بنجاح',
      en: 'User access created successfully',
    },
  },

  /**
   * User access retrieved successfully
   */
  GET_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Ahmed',
        lastName: 'Ali',
        email: 'ahmed.ali@example.com',
        role: UserRole.ADMIN,
      },
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
      role: UserRole.ADMIN,
      customPermissions: [
        PermissionsEnum.USER_READ,
        PermissionsEnum.USER_CREATE,
      ],
      isActive: true,
      grantedBy: {
        _id: '507f1f77bcf86cd799439014',
        firstName: 'Sara',
        lastName: 'Mohammed',
      },
      grantedAt: '2026-02-07T10:00:00.000Z',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم استرجاع صلاحية الوصول بنجاح',
      en: 'User access record retrieved successfully',
    },
  },

  /**
   * User access list with pagination
   */
  LIST_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        userId: {
          _id: '507f1f77bcf86cd799439012',
          firstName: 'Ahmed',
          lastName: 'Ali',
          email: 'ahmed.ali@example.com',
        },
        scopeType: 'clinic',
        scopeId: '507f1f77bcf86cd799439013',
        role: UserRole.ADMIN,
        isActive: true,
        grantedAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439015',
        userId: {
          _id: '507f1f77bcf86cd799439016',
          firstName: 'Fatima',
          lastName: 'Hassan',
          email: 'fatima.hassan@example.com',
        },
        scopeType: 'complex',
        scopeId: '507f1f77bcf86cd799439017',
        role: UserRole.DOCTOR,
        isActive: true,
        grantedAt: '2026-02-07T11:00:00.000Z',
      },
    ],
    pagination: {
      total: 25,
      page: 1,
      totalPages: 3,
      limit: 10,
    },
    message: {
      ar: 'تم استرجاع سجلات صلاحيات الوصول بنجاح',
      en: 'User access records retrieved successfully',
    },
  },

  /**
   * User access updated successfully
   */
  UPDATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
      role: UserRole.DOCTOR,
      customPermissions: [
        PermissionsEnum.USER_READ,
        PermissionsEnum.USER_CREATE,
        PermissionsEnum.USER_UPDATE,
      ],
      isActive: true,
      updatedAt: '2026-02-07T12:00:00.000Z',
    },
    message: {
      ar: 'تم تحديث صلاحية الوصول بنجاح',
      en: 'User access updated successfully',
    },
  },

  /**
   * User access deleted successfully
   */
  DELETE_SUCCESS: {
    success: true,
    message: {
      ar: 'تم حذف صلاحية الوصول بنجاح',
      en: 'User access deleted successfully',
    },
  },
};

/**
 * Permission Management Examples
 */
export const PERMISSION_EXAMPLES = {
  /**
   * Permission check result
   */
  CHECK_PERMISSION_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439012',
      permission: PermissionsEnum.USER_READ,
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
      hasPermission: true,
    },
    message: {
      ar: 'تم التحقق من الصلاحية بنجاح',
      en: 'Permission check completed',
    },
  },

  /**
   * Multiple permissions check result
   */
  CHECK_MULTIPLE_PERMISSIONS_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439012',
      hasAccess: true,
      requirementType: 'all',
      permissionResults: [
        {
          permission: PermissionsEnum.USER_READ,
          granted: true,
        },
        {
          permission: PermissionsEnum.USER_CREATE,
          granted: true,
        },
      ],
    },
    message: {
      ar: 'تم التحقق من الصلاحيات بنجاح',
      en: 'Permission checks completed',
    },
  },

  /**
   * Permissions assigned successfully
   */
  ASSIGN_PERMISSIONS_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439012',
      permissions: [PermissionsEnum.USER_READ, PermissionsEnum.USER_CREATE],
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
    },
    message: {
      ar: 'تم تعيين الصلاحيات بنجاح',
      en: 'Permissions assigned successfully',
    },
  },

  /**
   * Permissions revoked successfully
   */
  REVOKE_PERMISSIONS_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439012',
      permissions: [PermissionsEnum.USER_DELETE],
      scopeType: 'clinic',
      scopeId: '507f1f77bcf86cd799439013',
      reason: 'Role change - no longer requires delete permission',
    },
    message: {
      ar: 'تم إلغاء الصلاحيات بنجاح',
      en: 'Permissions revoked successfully',
    },
  },

  /**
   * Entity access validation result
   */
  VALIDATE_ACCESS_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439012',
      entityType: 'clinic',
      entityId: '507f1f77bcf86cd799439013',
      canAccess: true,
    },
    message: {
      ar: 'تم التحقق من صلاحية الوصول بنجاح',
      en: 'Entity access validation completed',
    },
  },
};

/**
 * Access Log Examples
 */
export const ACCESS_LOG_EXAMPLES = {
  /**
   * Access log created successfully
   */
  CREATE_LOG_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439020',
      userId: '507f1f77bcf86cd799439012',
      eventType: 'login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
      riskLevel: 'low',
      createdAt: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم إنشاء سجل الوصول بنجاح',
      en: 'Access log created successfully',
    },
  },

  /**
   * Access logs list with pagination
   */
  GET_LOGS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439020',
        userId: {
          _id: '507f1f77bcf86cd799439012',
          firstName: 'Ahmed',
          lastName: 'Ali',
          email: 'ahmed.ali@example.com',
        },
        eventType: 'login',
        ipAddress: '192.168.1.100',
        status: 'success',
        riskLevel: 'low',
        createdAt: '2026-02-07T10:00:00.000Z',
      },
      {
        _id: '507f1f77bcf86cd799439021',
        userId: {
          _id: '507f1f77bcf86cd799439016',
          firstName: 'Fatima',
          lastName: 'Hassan',
          email: 'fatima.hassan@example.com',
        },
        eventType: 'failed_login',
        ipAddress: '192.168.1.105',
        status: 'failure',
        riskLevel: 'medium',
        createdAt: '2026-02-07T10:05:00.000Z',
      },
    ],
    pagination: {
      total: 150,
      page: 1,
      totalPages: 15,
      limit: 20,
    },
    message: {
      ar: 'تم استرجاع سجلات الوصول بنجاح',
      en: 'Access logs retrieved successfully',
    },
  },

  /**
   * Recent access logs
   */
  RECENT_LOGS_SUCCESS: {
    success: true,
    data: [
      {
        _id: '507f1f77bcf86cd799439020',
        userId: '507f1f77bcf86cd799439012',
        eventType: 'login',
        ipAddress: '192.168.1.100',
        status: 'success',
        createdAt: '2026-02-07T10:00:00.000Z',
      },
    ],
    count: 1,
    timeRange: {
      from: '2026-02-06T10:00:00.000Z',
      to: '2026-02-07T10:00:00.000Z',
    },
    message: {
      ar: 'تم استرجاع سجلات الوصول الأخيرة بنجاح',
      en: 'Recent access logs retrieved successfully',
    },
  },
};

/**
 * Bulk Operations Examples
 */
export const BULK_OPERATION_EXAMPLES = {
  /**
   * Bulk user access action completed
   */
  BULK_ACTION_SUCCESS: {
    success: true,
    data: {
      action: 'grant',
      totalUsers: 5,
      successful: 4,
      failed: 1,
      errors: ['User 507f1f77bcf86cd799439099: User not found'],
    },
    message: {
      ar: 'تم إكمال العملية الجماعية بنجاح',
      en: 'Bulk grant completed',
    },
  },
};

/**
 * Statistics Examples
 */
export const STATISTICS_EXAMPLES = {
  /**
   * User access statistics
   */
  USER_ACCESS_STATS: {
    success: true,
    data: {
      totalUsersWithAccess: 150,
      activeUsers: 142,
      usersWithExpiredAccess: 8,
      usersByRole: [
        { role: 'admin', count: 25, percentage: 17 },
        { role: 'manager', count: 40, percentage: 27 },
        { role: 'doctor', count: 60, percentage: 40 },
        { role: 'staff', count: 25, percentage: 17 },
      ],
      usersByScope: [
        { scopeType: 'organization', count: 5 },
        { scopeType: 'complex', count: 20 },
        { scopeType: 'clinic', count: 125 },
      ],
      recentAccessChanges: [
        {
          userId: '507f1f77bcf86cd799439012',
          userName: 'Ahmed Ali',
          changeType: 'role_change',
          timestamp: '2026-02-07T10:00:00.000Z',
        },
      ],
      accessByPermission: [],
      securityAlerts: [],
      loginTrends: [],
      topActiveUsers: [],
    },
    message: {
      ar: 'تم استرجاع إحصائيات صلاحيات الوصول بنجاح',
      en: 'User access statistics retrieved successfully',
    },
  },

  /**
   * Security statistics
   */
  SECURITY_STATS: {
    success: true,
    data: {
      totalAccessLogs: 5000,
      loginAttempts: 250,
      failedLogins: 15,
      suspiciousActivities: 3,
      blockedAttempts: 0,
      uniqueIpAddresses: 0,
      riskDistribution: [
        { riskLevel: 'low', count: 4500, percentage: 90 },
        { riskLevel: 'medium', count: 450, percentage: 9 },
        { riskLevel: 'high', count: 50, percentage: 1 },
      ],
      topRiskyUsers: [],
      accessByTimeOfDay: [],
      accessByLocation: [],
      deviceStats: [],
      browserStats: [],
    },
    message: {
      ar: 'تم استرجاع إحصائيات الأمان بنجاح',
      en: 'Security statistics retrieved successfully',
    },
  },
};

/**
 * Error Examples
 */
export const USER_ACCESS_ERROR_EXAMPLES = {
  /**
   * User access not found
   */
  NOT_FOUND: {
    success: false,
    error: {
      code: 'USER_ACCESS_NOT_FOUND',
      message: {
        ar: 'صلاحية الوصول غير موجودة',
        en: 'User access not found',
      },
      details: {
        accessId: '507f1f77bcf86cd799439011',
      },
    },
  },

  /**
   * User access already exists
   */
  ALREADY_EXISTS: {
    success: false,
    error: {
      code: 'USER_ACCESS_EXISTS',
      message: {
        ar: 'صلاحية الوصول موجودة بالفعل',
        en: 'User access already exists',
      },
      details: {
        userId: '507f1f77bcf86cd799439012',
        scopeType: 'clinic',
        scopeId: '507f1f77bcf86cd799439013',
      },
    },
  },

  /**
   * Scope entity not found
   */
  SCOPE_NOT_FOUND: {
    success: false,
    error: {
      code: 'SCOPE_ENTITY_NOT_FOUND',
      message: {
        ar: 'الكيان المحدد غير موجود',
        en: 'Scope entity not found',
      },
      details: {
        scopeType: 'clinic',
        scopeId: '507f1f77bcf86cd799439013',
      },
    },
  },

  /**
   * Insufficient permissions
   */
  INSUFFICIENT_PERMISSIONS: {
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: {
        ar: 'ليس لديك الصلاحيات الكافية',
        en: 'Insufficient permissions',
      },
      details: {
        required: PermissionsEnum.USER_UPDATE,
        current: [PermissionsEnum.USER_READ],
      },
    },
  },

  /**
   * Validation error
   */
  VALIDATION_ERROR: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: {
        ar: 'خطأ في التحقق من البيانات',
        en: 'Validation error',
      },
      details: {
        field: 'scopeType',
        constraint: 'isEnum',
        value: 'invalid_scope',
      },
    },
  },
};

/**
 * Combined examples for easy import
 */
export const USER_ACCESS_SWAGGER_EXAMPLES = {
  ...USER_ACCESS_SUCCESS_EXAMPLES,
  ...PERMISSION_EXAMPLES,
  ...ACCESS_LOG_EXAMPLES,
  ...BULK_OPERATION_EXAMPLES,
  ...STATISTICS_EXAMPLES,
  ...USER_ACCESS_ERROR_EXAMPLES,
};
