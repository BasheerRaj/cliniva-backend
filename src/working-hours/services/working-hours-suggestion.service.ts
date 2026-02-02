import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Complex } from '../../database/schemas/complex.schema';
import {
  ERROR_MESSAGES,
  createDynamicMessage,
} from '../../common/utils/error-messages.constant';
import {
  queryCache,
  WorkingHoursCacheKeys,
} from '../utils/query-cache.util';

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

@Injectable()
export class WorkingHoursSuggestionService {
  constructor(
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @InjectModel('Clinic')
    private readonly clinicModel: Model<Clinic>,
    @InjectModel('Complex')
    private readonly complexModel: Model<Complex>,
  ) {}

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
        .select('dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime')
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
        .select('dayOfWeek isWorkingDay openingTime closingTime breakStartTime breakEndTime')
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
      message: createDynamicMessage(
        'دور غير صالح',
        'Invalid role',
        {},
      ),
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
