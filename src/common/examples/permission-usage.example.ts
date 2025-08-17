import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { 
  Permissions, 
  CanCreateUser, 
  CanReadUser, 
  CanReadUserOrSelf,
  CanUpdateUserOrSelf, 
  CanDeleteUser, 
  CanListUsers,
  RequireAdminAccess,
  RequireAllPermissions,
  RequireAnyPermission 
} from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionsEnum } from '../enums/permissions.enum';

/**
 * Example controller demonstrating permission usage
 * This shows how to protect routes with different permission patterns
 */
@Controller('users')
@UseGuards(PermissionsGuard) // Apply permissions guard to all routes
export class UserManagementController {

  /**
   * Create a new user - requires USER_CREATE permission
   */
  @Post()
  @CanCreateUser()
  async createUser(@Body() userData: any) {
    return { message: 'User created successfully', data: userData };
  }

  /**
   * Get user list - requires USER_LIST permission
   */
  @Get()
  @CanListUsers()
  async getUsers() {
    return { message: 'Users retrieved successfully' };
  }

  /**
   * Get specific user - requires USER_READ permission or self-access
   */
  @Get(':userId')
  @CanReadUserOrSelf('userId')
  async getUser(@Param('userId') userId: string) {
    return { message: `User ${userId} retrieved successfully` };
  }

  /**
   * Update user - requires USER_UPDATE permission or self-access
   */
  @Put(':userId')
  @CanUpdateUserOrSelf('userId')
  async updateUser(@Param('userId') userId: string, @Body() updateData: any) {
    return { message: `User ${userId} updated successfully`, data: updateData };
  }

  /**
   * Delete user - requires USER_DELETE permission (no self-access for security)
   */
  @Delete(':userId')
  @CanDeleteUser()
  async deleteUser(@Param('userId') userId: string) {
    return { message: `User ${userId} deleted successfully` };
  }

  /**
   * Activate user - requires both USER_UPDATE and USER_ACTIVATE permissions
   */
  @Post(':userId/activate')
  @RequireAllPermissions(PermissionsEnum.USER_UPDATE, PermissionsEnum.USER_ACTIVATE)
  async activateUser(@Param('userId') userId: string) {
    return { message: `User ${userId} activated successfully` };
  }

  /**
   * Reset user password - requires either USER_RESET_PASSWORD or ADMIN_ACCESS
   */
  @Post(':userId/reset-password')
  @RequireAnyPermission(PermissionsEnum.USER_RESET_PASSWORD, PermissionsEnum.ADMIN_ACCESS)
  async resetPassword(@Param('userId') userId: string) {
    return { message: `Password reset for user ${userId}` };
  }

  /**
   * Admin-only endpoint - requires ADMIN_ACCESS permission
   */
  @Get('admin/analytics')
  @RequireAdminAccess()
  async getAnalytics() {
    return { message: 'Analytics data retrieved successfully' };
  }

  /**
   * Custom permission example - requires specific combination
   */
  @Post(':userId/change-role')
  @Permissions([PermissionsEnum.USER_CHANGE_ROLE, PermissionsEnum.ROLE_READ], { requireAll: true })
  async changeUserRole(@Param('userId') userId: string, @Body() roleData: any) {
    return { message: `Role changed for user ${userId}`, data: roleData };
  }
}

/**
 * Example group management controller
 */
@Controller('groups')
@UseGuards(PermissionsGuard)
export class GroupManagementController {

  @Post()
  @Permissions([PermissionsEnum.GROUP_CREATE])
  async createGroup(@Body() groupData: any) {
    return { message: 'Group created successfully', data: groupData };
  }

  @Get()
  @Permissions([PermissionsEnum.GROUP_LIST])
  async getGroups() {
    return { message: 'Groups retrieved successfully' };
  }

  @Put(':groupId/users')
  @Permissions([PermissionsEnum.GROUP_ASSIGN_USERS])
  async assignUsers(@Param('groupId') groupId: string, @Body() userData: any) {
    return { message: `Users assigned to group ${groupId}`, data: userData };
  }

  @Delete(':groupId/users/:userId')
  @Permissions([PermissionsEnum.GROUP_REMOVE_USERS])
  async removeUser(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return { message: `User ${userId} removed from group ${groupId}` };
  }
}

/**
 * Example service showing programmatic permission checking
 */
export class ExamplePermissionService {
  constructor(private permissionService: any) {} // Would inject PermissionService

  async checkUserAccess(user: any, resourceId: string) {
    // Check if user can read the resource
    const canRead = this.permissionService.hasPermission(user, PermissionsEnum.USER_READ);
    
    if (!canRead) {
      throw new Error('Insufficient permissions to read resource');
    }

    // Check multiple permissions
    const canManage = this.permissionService.hasAllPermissions(user, [
      PermissionsEnum.USER_UPDATE,
      PermissionsEnum.USER_DELETE
    ]);

    return {
      canRead: true,
      canManage,
      permissions: this.permissionService.getAllPermissions(user)
    };
  }
}

/**
 * Example of permission setup in a module
 */
/*
import { Module } from '@nestjs/common';
import { PermissionsGuard, PermissionService } from '../common';

@Module({
  controllers: [UserManagementController, GroupManagementController],
  providers: [
    PermissionsGuard,
    PermissionService,
    ExamplePermissionService,
  ],
  exports: [PermissionService],
})
export class UserModule {}
*/
