import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from './dto/create-working-hours.dto';
import { ValidationUtil } from '../common/utils/validation.util';
import {
  ERROR_MESSAGES,
  createDynamicMessage,
} from '../common/utils/error-messages.constant';
import { WorkingHoursValidationService } from './services/working-hours-validation.service';
import { queryCache, WorkingHoursCacheKeys } from './utils/query-cache.util';

@Injectable()
export class WorkingHoursService {
  constructor(
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<WorkingHours>,
    @Inject(forwardRef(() => WorkingHoursValidationService))
    private readonly validationService: WorkingHoursValidationService,
  ) {}

  /**
   * Creates working hours for an entity.
   * Validates schedule format and replaces any existing working hours.
   * Invalidates cache for the entity after creation.
   *
   * @param {CreateWorkingHoursDto} createDto - Working hours creation data
   * @returns {Promise<WorkingHours[]>} Created working hours records
   * @throws {BadRequestException} When schedule validation fails
   */
  async createWorkingHours(
    createDto: CreateWorkingHoursDto,
  ): Promise<WorkingHours[]> {
    // Validate schedule using utility (basic format validation)
    const validation = ValidationUtil.validateWorkingHours(createDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: createDynamicMessage(
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.ar}: ${validation.errors.join(', ')}`,
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.en}: ${validation.errors.join(', ')}`,
          {},
        ),
        code: 'SCHEDULE_VALIDATION_FAILED',
        details: { errors: validation.errors },
      });
    }

    // Delete existing working hours for this entity
    await this.workingHoursModel.deleteMany({
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId),
    });

    // Create new working hours
    const workingHours = createDto.schedule.map((schedule) => ({
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId),
      ...schedule,
      isActive: true,
    }));

    const result = await this.workingHoursModel.insertMany(workingHours);

    // Invalidate cache for this entity
    this.invalidateEntityCache(createDto.entityType, createDto.entityId);

    return result;
  }

  /**
   * Updates working hours for an entity.
   * Validates schedule format and replaces existing working hours.
   * Invalidates cache for the entity after update.
   *
   * @param {string} entityType - Entity type (organization, complex, clinic, user)
   * @param {string} entityId - Entity ID
   * @param {UpdateWorkingHoursDto} updateDto - Working hours update data
   * @returns {Promise<WorkingHours[]>} Updated working hours records
   * @throws {BadRequestException} When schedule validation fails
   */
  async updateWorkingHours(
    entityType: string,
    entityId: string,
    updateDto: UpdateWorkingHoursDto,
  ): Promise<WorkingHours[]> {
    // Validate schedule using utility (basic format validation)
    const validation = ValidationUtil.validateWorkingHours(updateDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: createDynamicMessage(
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.ar}: ${validation.errors.join(', ')}`,
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.en}: ${validation.errors.join(', ')}`,
          {},
        ),
        code: 'SCHEDULE_VALIDATION_FAILED',
        details: { errors: validation.errors },
      });
    }

    // Delete existing and create new
    await this.workingHoursModel.deleteMany({
      entityType,
      entityId: new Types.ObjectId(entityId),
    });

    const workingHours = updateDto.schedule.map((schedule) => ({
      entityType,
      entityId: new Types.ObjectId(entityId),
      ...schedule,
      isActive: true,
    }));

    const result = await this.workingHoursModel.insertMany(workingHours);

    // Invalidate cache for this entity
    this.invalidateEntityCache(entityType, entityId);

    return result;
  }

  async getWorkingHours(
    entityType: string,
    entityId: string,
  ): Promise<WorkingHours[]> {
    return await this.workingHoursModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isActive: true,
      })
      .exec();
  }

  /**
   * Creates working hours with parent entity validation.
   * Uses WorkingHoursValidationService for hierarchical validation.
   *
   * Business Rules:
   * - BZR-f1c0a9e4: Hierarchical validation (complex→clinic, clinic→user)
   * - BZR-u5a0f7d3: Child hours must be within parent hours
   * - BZR-42: Child cannot be open when parent is closed
   *
   * @param {CreateWorkingHoursDto} createDto - Working hours creation data
   * @param {string} parentEntityType - Parent entity type (optional)
   * @param {string} parentEntityId - Parent entity ID (optional)
   * @returns {Promise<WorkingHours[]>} Created working hours records
   * @throws {BadRequestException} When validation fails
   */
  async createWorkingHoursWithParentValidation(
    createDto: CreateWorkingHoursDto,
    parentEntityType?: string,
    parentEntityId?: string,
  ): Promise<WorkingHours[]> {
    // Validate schedule format first
    const validation = ValidationUtil.validateWorkingHours(createDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: createDynamicMessage(
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.ar}: ${validation.errors.join(', ')}`,
          `${ERROR_MESSAGES.SCHEDULE_VALIDATION_FAILED.en}: ${validation.errors.join(', ')}`,
          {},
        ),
        code: 'SCHEDULE_VALIDATION_FAILED',
        details: { errors: validation.errors },
      });
    }

    // If parent entity specified, use validation service for hierarchical validation
    if (parentEntityType && parentEntityId) {
      const hierarchicalValidation =
        await this.validationService.validateHierarchical(
          createDto.schedule,
          parentEntityType,
          parentEntityId,
          `${createDto.entityType} (${createDto.entityId})`,
        );

      if (!hierarchicalValidation.isValid) {
        throw new BadRequestException({
          message: createDynamicMessage(
            ERROR_MESSAGES.HIERARCHICAL_VALIDATION_FAILED.ar,
            ERROR_MESSAGES.HIERARCHICAL_VALIDATION_FAILED.en,
            {},
          ),
          code: 'HIERARCHICAL_VALIDATION_FAILED',
          details: { errors: hierarchicalValidation.errors },
        });
      }
    }

    // Create working hours if validation passes
    return await this.createWorkingHours(createDto);
  }

  /**
   * Validates clinic working hours against complex working hours.
   * Uses WorkingHoursValidationService for hierarchical validation.
   *
   * @deprecated Use WorkingHoursValidationService.validateHierarchical() instead
   * @param {string} clinicId - Clinic ID
   * @param {any[]} clinicSchedule - Clinic schedule to validate
   * @param {string} complexId - Complex ID
   * @returns {Promise<{ isValid: boolean; errors: string[] }>} Validation result
   */
  async validateClinicHoursWithinComplex(
    clinicId: string,
    clinicSchedule: any[],
    complexId: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // Use validation service for hierarchical validation
    const result = await this.validationService.validateHierarchical(
      clinicSchedule,
      'complex',
      complexId,
      `Clinic (${clinicId})`,
    );

    // Convert ValidationError[] to string[] for backward compatibility
    const errors = result.errors.map((error) => {
      // Use English message for backward compatibility
      return typeof error.message === 'object'
        ? error.message.en
        : error.message;
    });

    return { isValid: result.isValid, errors };
  }

  async getParentEntityWorkingHours(
    childEntityType: string,
    childEntityId: string,
  ): Promise<{
    parentType: string;
    parentId: string;
    schedule: WorkingHours[];
  } | null> {
    // This would need to be implemented based on your entity relationships
    // For now, return null - this would require querying the clinic/complex relationships

    if (childEntityType === 'clinic') {
      // You would query the clinic to get its complexDepartmentId
      // Then query complexDepartment to get complexId
      // Then return the complex working hours
      // For now, returning null as this requires database queries
    }

    return null;
  }

  async createBulkWorkingHours(
    schedules: any[],
    entityMappings: Array<{ type: string; id: string }>,
  ): Promise<void> {
    // This method would handle bulk creation during onboarding
    for (const mapping of entityMappings) {
      const entitySchedules = schedules.filter(
        (s) => s.entityType === mapping.type,
      );
      if (entitySchedules.length > 0) {
        await this.createWorkingHours({
          entityType: mapping.type,
          entityId: mapping.id,
          schedule: entitySchedules,
        });
      }
    }
  }

  async createBulkWorkingHoursWithValidation(
    schedules: any[],
    entityMappings: Array<{
      type: string;
      id: string;
      parentType?: string;
      parentId?: string;
    }>,
  ): Promise<void> {
    // Sort entities by hierarchy (complex before clinic)
    const sortedMappings = entityMappings.sort((a, b) => {
      const hierarchy = { organization: 1, complex: 2, clinic: 3 };
      return (hierarchy[a.type] || 999) - (hierarchy[b.type] || 999);
    });

    for (const mapping of sortedMappings) {
      const entitySchedules = schedules.filter(
        (s) => s.entityType === mapping.type,
      );
      if (entitySchedules.length > 0) {
        if (mapping.parentType && mapping.parentId) {
          await this.createWorkingHoursWithParentValidation(
            {
              entityType: mapping.type,
              entityId: mapping.id,
              schedule: entitySchedules,
            },
            mapping.parentType,
            mapping.parentId,
          );
        } else {
          await this.createWorkingHours({
            entityType: mapping.type,
            entityId: mapping.id,
            schedule: entitySchedules,
          });
        }
      }
    }
  }

  /**
   * Invalidates all cache entries related to an entity.
   * Called after creating or updating working hours.
   *
   * @private
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   */
  private invalidateEntityCache(entityType: string, entityId: string): void {
    // Invalidate all cache entries for this entity
    const pattern = WorkingHoursCacheKeys.invalidateEntity(
      entityType,
      entityId,
    );
    queryCache.invalidatePattern(pattern);
  }
}
