import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { User } from '../../database/schemas/user.schema';
import {
  ERROR_MESSAGES,
  createDynamicMessage,
} from '../../common/utils/error-messages.constant';
import { queryCache, WorkingHoursCacheKeys } from '../utils/query-cache.util';

export interface SuggestedSchedule {
  dayOfWeek: string;
  isWorkingDay: boolean;
  openingTime?: string;
  closingTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface EntityInfo {
  entityType: 'clinic' | 'complex';
  entityId: string;
  entityName: string;
}

export interface SuggestionResult {
  suggestedSchedule: SuggestedSchedule[];
  source: EntityInfo;
  canModify: boolean;
}

type EntityType = 'user' | 'clinic' | 'complex' | 'organization';

const STANDARD_BUSINESS_HOURS: SuggestedSchedule[] = [
  {
    dayOfWeek: 'monday',
    isWorkingDay: true,
    openingTime: '09:00',
    closingTime: '17:00',
  },
  {
    dayOfWeek: 'tuesday',
    isWorkingDay: true,
    openingTime: '09:00',
    closingTime: '17:00',
  },
  {
    dayOfWeek: 'wednesday',
    isWorkingDay: true,
    openingTime: '09:00',
    closingTime: '17:00',
  },
  {
    dayOfWeek: 'thursday',
    isWorkingDay: true,
    openingTime: '09:00',
    closingTime: '17:00',
  },
  {
    dayOfWeek: 'friday',
    isWorkingDay: true,
    openingTime: '09:00',
    closingTime: '17:00',
  },
  {
    dayOfWeek: 'saturday',
    isWorkingDay: false,
  },
  {
    dayOfWeek: 'sunday',
    isWorkingDay: false,
  },
];

@Injectable()
export class WorkingHoursSuggestionService {
  constructor(
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @InjectModel('Clinic')
    private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex')
    private readonly complexModel: Model<Complex>,
    @InjectModel('User')
    private readonly userModel: Model<any>,
  ) {}

  /**
   * Get suggested working hours based on entity type and ID
   * Implements Requirements 12.1, 12.2, 12.4
   *
   * @param entityType - Type of entity ('user', 'clinic', 'complex', 'organization')
   * @param entityId - Entity ID
   * @returns Suggested schedule with source information
   */
  async getSuggestions(
    entityType: EntityType,
    entityId: string,
  ): Promise<SuggestionResult> {
    // Determine parent entity based on entityType
    const parentInfo = await this.getParentEntity(entityType, entityId);

    if (!parentInfo) {
      // No parent entity, return standard business hours
      return {
        suggestedSchedule: STANDARD_BUSINESS_HOURS,
        source: {
          entityType: 'complex', // Default source type
          entityId: '',
          entityName: 'Standard Business Hours',
        },
        canModify: true,
      };
    }

    // Query parent entity working hours
    const parentHours = await this.workingHoursModel
      .find({
        entityType: parentInfo.entityType,
        entityId: new Types.ObjectId(parentInfo.entityId),
        isActive: true,
      })
      .select(
        'dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
      )
      .lean()
      .exec();

    if (parentHours.length === 0) {
      // Parent exists but has no hours, return standard business hours
      return {
        suggestedSchedule: STANDARD_BUSINESS_HOURS,
        source: {
          entityType: parentInfo.entityType,
          entityId: parentInfo.entityId,
          entityName: parentInfo.entityName,
        },
        canModify: true,
      };
    }

    // Return parent hours as suggestions
    return {
      suggestedSchedule: parentHours.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        isWorkingDay: hour.isWorkingDay,
        openingTime: hour.openingTime,
        closingTime: hour.closingTime,
        breakStartTime: hour.breakStartTime,
        breakEndTime: hour.breakEndTime,
      })),
      source: {
        entityType: parentInfo.entityType,
        entityId: parentInfo.entityId,
        entityName: parentInfo.entityName,
      },
      canModify: true,
    };
  }

  /**
   * Determine parent entity based on entity type
   * Hierarchy: User → Clinic, Clinic → Complex, Complex → Organization
   *
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @returns Parent entity information or null if no parent
   */
  private async getParentEntity(
    entityType: EntityType,
    entityId: string,
  ): Promise<EntityInfo | null> {
    try {
      if (entityType === 'user') {
        // User's parent is Clinic
        const user = await this.userModel
          .findById(new Types.ObjectId(entityId))
          .select('clinicId')
          .lean()
          .exec();

        if (!user || !(user as any).clinicId) {
          return null;
        }

        const clinic = await this.clinicModel
          .findById((user as any).clinicId)
          .select('name')
          .lean()
          .exec();

        if (!clinic) {
          return null;
        }

        return {
          entityType: 'clinic',
          entityId: (user as any).clinicId.toString(),
          entityName: (clinic as any).name,
        };
      } else if (entityType === 'clinic') {
        // Clinic's parent is Complex
        const clinic = await this.clinicModel
          .findById(new Types.ObjectId(entityId))
          .select('complexId')
          .lean()
          .exec();

        if (!clinic || !clinic.complexId) {
          return null;
        }

        const complex = await this.complexModel
          .findById(clinic.complexId)
          .select('name')
          .lean()
          .exec();

        if (!complex) {
          return null;
        }

        return {
          entityType: 'complex',
          entityId: clinic.complexId.toString(),
          entityName: complex.name,
        };
      } else if (entityType === 'complex') {
        // Complex's parent is Organization
        // Note: Organization schema not available in current codebase
        // Return null for now (will use standard business hours)
        return null;
      } else if (entityType === 'organization') {
        // Organization has no parent
        return null;
      }

      return null;
    } catch (error) {
      // If any error occurs, return null to fall back to standard hours
      return null;
    }
  }

  /**
   * Get suggested working hours based on role and entity assignment
   * Uses projection to fetch only required fields for performance.
   *
   * @param role - 'doctor' or 'staff'
   * @param clinicId - Clinic ID for doctors
   * @param complexId - Complex ID for staff
   * @returns Suggested schedule with source information
   */
  async getSuggestedHours(
    role: 'doctor' | 'staff',
    clinicId?: string,
    complexId?: string,
  ): Promise<SuggestionResult> {
    if (role === 'doctor') {
      if (!clinicId) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.CLINIC_ID_REQUIRED,
          code: 'CLINIC_ID_REQUIRED',
        });
      }

      // Get clinic working hours with projection
      const clinicHours = await this.workingHoursModel
        .find({
          entityType: 'clinic',
          entityId: new Types.ObjectId(clinicId),
          isActive: true,
        })
        .select(
          'dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
        )
        .lean()
        .exec();

      if (clinicHours.length === 0) {
        throw new NotFoundException({
          message: createDynamicMessage(
            'لم يتم العثور على ساعات عمل للعيادة',
            'No working hours found for clinic',
            {},
          ),
          code: 'CLINIC_HOURS_NOT_FOUND',
        });
      }

      // Get clinic details
      const clinicInfo = await this.getEntityDetails('clinic', clinicId);

      return {
        suggestedSchedule: clinicHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          isWorkingDay: hour.isWorkingDay,
          openingTime: hour.openingTime,
          closingTime: hour.closingTime,
          breakStartTime: hour.breakStartTime,
          breakEndTime: hour.breakEndTime,
        })),
        source: clinicInfo,
        canModify: true,
      };
    } else if (role === 'staff') {
      if (!complexId) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.COMPLEX_ID_REQUIRED,
          code: 'COMPLEX_ID_REQUIRED',
        });
      }

      // Get complex working hours with projection
      const complexHours = await this.workingHoursModel
        .find({
          entityType: 'complex',
          entityId: new Types.ObjectId(complexId),
          isActive: true,
        })
        .select(
          'dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime',
        )
        .lean()
        .exec();

      if (complexHours.length === 0) {
        throw new NotFoundException({
          message: createDynamicMessage(
            'لم يتم العثور على ساعات عمل للمجمع',
            'No working hours found for complex',
            {},
          ),
          code: 'COMPLEX_HOURS_NOT_FOUND',
        });
      }

      // Get complex details
      const complexInfo = await this.getEntityDetails('complex', complexId);

      return {
        suggestedSchedule: complexHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          isWorkingDay: hour.isWorkingDay,
          openingTime: hour.openingTime,
          closingTime: hour.closingTime,
          breakStartTime: hour.breakStartTime,
          breakEndTime: hour.breakEndTime,
        })),
        source: complexInfo,
        canModify: true,
      };
    }

    throw new NotFoundException({
      message: createDynamicMessage('دور غير صالح', 'Invalid role', {}),
      code: 'INVALID_ROLE',
    });
  }

  /**
   * Get entity details (name and ID) for source information
   * Results are cached for 10 minutes to reduce database load.
   *
   * @param entityType - Type of entity ('clinic' or 'complex')
   * @param entityId - Entity ID
   * @returns Entity information
   */
  async getEntityDetails(
    entityType: string,
    entityId: string,
  ): Promise<EntityInfo> {
    // Check cache first
    const cacheKey = WorkingHoursCacheKeys.entityDetails(entityType, entityId);
    const cached = queryCache.get<EntityInfo>(cacheKey);

    if (cached) {
      return cached;
    }

    let entityInfo: EntityInfo;

    if (entityType === 'clinic') {
      const clinic = await this.clinicModel
        .findById(new Types.ObjectId(entityId))
        .select('name')
        .lean()
        .exec();

      if (!clinic) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.CLINIC_NOT_FOUND,
          code: 'CLINIC_NOT_FOUND',
        });
      }

      entityInfo = {
        entityType: 'clinic',
        entityId: entityId,
        entityName: clinic.name,
      };
    } else if (entityType === 'complex') {
      const complex = await this.complexModel
        .findById(new Types.ObjectId(entityId))
        .select('name')
        .lean()
        .exec();

      if (!complex) {
        throw new NotFoundException({
          message: ERROR_MESSAGES.COMPLEX_NOT_FOUND,
          code: 'COMPLEX_NOT_FOUND',
        });
      }

      entityInfo = {
        entityType: 'complex',
        entityId: entityId,
        entityName: complex.name,
      };
    } else {
      throw new NotFoundException({
        message: createDynamicMessage(
          'نوع كيان غير صالح',
          'Invalid entity type',
          {},
        ),
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    // Cache the result (10 minutes TTL)
    queryCache.set(cacheKey, entityInfo, 10 * 60 * 1000);

    return entityInfo;
  }
}
