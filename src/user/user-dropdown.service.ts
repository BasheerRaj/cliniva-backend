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
  clinicIds?: string[];
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
  clinicID: string | null;
  ClinicName: string | null;
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
    requestingUser?: any,
  ): Promise<DropdownUser[]> {
    try {
      // Build query - Requirement 10.1: Default isActive: true filter
      const query: any = {};

      // TENANT ISOLATION: scope to requesting user's subscription/org
      if (requestingUser && requestingUser.role !== 'super_admin') {
        if (requestingUser.subscriptionId) {
          query.subscriptionId = new Types.ObjectId(requestingUser.subscriptionId.toString());
        }
      }

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

      // Requirement 10.3: Support filtering by clinicId / clinicIds
      const clinicFilters = [
        ...(filters?.clinicId ? [filters.clinicId] : []),
        ...(filters?.clinicIds || []),
      ];

      if (clinicFilters.length > 0) {
        const validClinicIds = Array.from(
          new Set(
            clinicFilters.filter((clinicId) => Types.ObjectId.isValid(clinicId)),
          ),
        );

        const invalidClinicIds = clinicFilters.filter(
          (clinicId) => !Types.ObjectId.isValid(clinicId),
        );

        if (invalidClinicIds.length > 0) {
          this.logger.warn(
            `Invalid clinicId format(s): ${invalidClinicIds.join(', ')}. Skipping invalid values.`,
          );
        }

        if (validClinicIds.length === 1) {
          query.clinicId = new Types.ObjectId(validClinicIds[0]);
        } else if (validClinicIds.length > 1) {
          query.clinicId = {
            $in: validClinicIds.map((clinicId) => new Types.ObjectId(clinicId)),
          };
        }
      }

      // Requirement 10.4: Return minimal user data (id, name, email, role, isActive)
      // Execute query with sorting by firstName, lastName
      const users = await this.userModel
        .find(query)
        .select('_id firstName lastName email role isActive clinicId')
        .populate('clinicId', 'name')
        .sort({ firstName: 1, lastName: 1 })
        .lean()
        .exec();

      this.logger.log(
        `Retrieved ${users.length} users for dropdown with filters: ${JSON.stringify(filters || {})}`,
      );

      // Map to DropdownUser interface
      return users.map((user) => {
        const clinicRef = user.clinicId as any;
        const clinicID = clinicRef ? String(clinicRef._id ?? clinicRef) : null;
        const clinicName =
          clinicRef && typeof clinicRef === 'object'
            ? (clinicRef.name ?? null)
            : null;

        return {
          _id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          clinicID,
          ClinicName: clinicName,
        };
      });
    } catch (error) {
      this.logger.error('Error getting users for dropdown:', error);
      throw error;
    }
  }
}
