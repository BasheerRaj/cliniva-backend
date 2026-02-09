import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/utils/error-messages.constant';

/**
 * User Restriction Service
 *
 * This service handles validation for self-action restrictions.
 * It prevents users from performing restricted actions on their own accounts.
 *
 * Task 9.1: Create user restriction service
 * Requirements: 8.1, 8.3, 9.1, 9.3
 * Design: Section 2.1 - User Restriction Service
 *
 * Business Rules:
 * - BZR-n0c4e9f2: Users cannot deactivate their own account
 * - BZR-m3d5a8b7: Users cannot delete their own account
 * - Users cannot change their own role (implicit business rule)
 */
@Injectable()
export class UserRestrictionService {
  private readonly logger = new Logger(UserRestrictionService.name);

  /**
   * Check if user can deactivate target user
   *
   * Validates that the actor is not attempting to deactivate themselves.
   *
   * @param actorId - ID of user performing the action
   * @param targetId - ID of user being deactivated
   * @returns true if action is allowed, throws ForbiddenException otherwise
   * @throws ForbiddenException with bilingual error message if self-action
   */
  canDeactivateUser(actorId: string, targetId: string): boolean {
    this.logger.debug(
      `Checking deactivate permission: actor=${actorId}, target=${targetId}`,
    );

    if (actorId === targetId) {
      this.logger.warn(
        `User ${actorId} attempted to deactivate their own account`,
      );
      throw new ForbiddenException({
        message: ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF,
        code: 'CANNOT_DEACTIVATE_SELF',
      });
    }

    this.logger.debug(`Deactivate permission granted for user ${targetId}`);
    return true;
  }

  /**
   * Check if user can delete target user
   *
   * Validates that the actor is not attempting to delete themselves.
   *
   * @param actorId - ID of user performing the action
   * @param targetId - ID of user being deleted
   * @returns true if action is allowed, throws ForbiddenException otherwise
   * @throws ForbiddenException with bilingual error message if self-action
   */
  canDeleteUser(actorId: string, targetId: string): boolean {
    this.logger.debug(
      `Checking delete permission: actor=${actorId}, target=${targetId}`,
    );

    if (actorId === targetId) {
      this.logger.warn(`User ${actorId} attempted to delete their own account`);
      throw new ForbiddenException({
        message: ERROR_MESSAGES.CANNOT_DELETE_SELF,
        code: 'CANNOT_DELETE_SELF',
      });
    }

    this.logger.debug(`Delete permission granted for user ${targetId}`);
    return true;
  }

  /**
   * Check if user can change target user's role
   *
   * Validates that the actor is not attempting to change their own role.
   *
   * @param actorId - ID of user performing the action
   * @param targetId - ID of user whose role is being changed
   * @returns true if action is allowed, throws ForbiddenException otherwise
   * @throws ForbiddenException with bilingual error message if self-action
   */
  canChangeRole(actorId: string, targetId: string): boolean {
    this.logger.debug(
      `Checking role change permission: actor=${actorId}, target=${targetId}`,
    );

    if (actorId === targetId) {
      this.logger.warn(`User ${actorId} attempted to change their own role`);
      throw new ForbiddenException({
        message: ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE,
        code: 'CANNOT_CHANGE_OWN_ROLE',
      });
    }

    this.logger.debug(`Role change permission granted for user ${targetId}`);
    return true;
  }
}
