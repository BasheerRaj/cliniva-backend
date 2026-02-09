import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../database/schemas/user.schema';

/**
 * Interface for dropdown filters
 * Task 11.1: Create user dropdown service
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export interface DropdownFilters {
  role?: string;
  complexId?: string;
  clinicId?: string;
  includeDeactivated?: boolean;
}

/**
 * Interface for dropdown user data
 * Returns minimal user data for dropdown display
 */
export interface DropdownUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

/**
 * User Dropdown Service
 *
 * Provides filtered user lists for dropdowns, excluding deactivated users by default.
 * This service is used throughout the application for user selection in forms and filters.
 *
 * Task 11.1: Create user dropdown service
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * Design: Section 2.3 - User Dropdown Service
 *
 * Business Rules:
 * - BZR-q4f3e1b8: Deactivated users excluded from dropdowns by default
 * - Requirement 10.1: Default isActive: true filter
 * - Requirement 10.2: Support includeDeactivated parameter
 * - Requirement 10.3: Filter by role, complexId, clinicId
 * - Requirement 10.4: Return minimal user data
 */
@Injectable()
export class UserDropdownService {
  private readonly logger = new Logger(UserDropdownService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  /**
   * Get users for dropdown with optional filters
   *
   * This method returns a list of users suitable for dropdown/selection purposes.
   * By default, it excludes deactivated users (isActive: true).
   *
   * Task 11.1: Implement getUsersForDropdown method
   * Requirements: 10.1, 10.2, 10.3, 10.4
   *
   * @param filters - Optional filters for role, complex, clinic, and deactivated users
   * @returns Array of dropdown users with minimal data
   */
  async getUsersForDropdown(
    filters?: DropdownFilters,
  ): Promise<DropdownUser[]> {
    try {
      // Build query - Requirement 10.1: Default isActive: true filter
      const query: any = {};

      // Requirement 10.2: Support includeDeactivated parameter
      if (!filters?.includeDeactivated) {
        query.isActive = true;
      }

      // Requirement 10.3: Support filtering by role
      if (filters?.role) {
        query.role = filters.role;
      }

      // Requirement 10.3: Support filtering by complexId
      if (filters?.complexId) {
        if (Types.ObjectId.isValid(filters.complexId)) {
          query.complexId = new Types.ObjectId(filters.complexId);
        } else {
          this.logger.warn(
            `Invalid complexId format: ${filters.complexId}. Skipping filter.`,
          );
        }
      }

      // Requirement 10.3: Support filtering by clinicId
      if (filters?.clinicId) {
        if (Types.ObjectId.isValid(filters.clinicId)) {
          query.clinicId = new Types.ObjectId(filters.clinicId);
        } else {
          this.logger.warn(
            `Invalid clinicId format: ${filters.clinicId}. Skipping filter.`,
          );
        }
      }

      // Requirement 10.4: Return minimal user data (id, name, email, role, isActive)
      // Execute query with sorting by firstName, lastName
      const users = await this.userModel
        .find(query)
        .select('_id firstName lastName email role isActive')
        .sort({ firstName: 1, lastName: 1 })
        .lean()
        .exec();

      this.logger.log(
        `Retrieved ${users.length} users for dropdown with filters: ${JSON.stringify(filters || {})}`,
      );

      // Map to DropdownUser interface
      return users.map((user) => ({
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      }));
    } catch (error) {
      this.logger.error('Error getting users for dropdown:', error);
      throw error;
    }
  }
}
