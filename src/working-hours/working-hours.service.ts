import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkingHours } from '../database/schemas/working-hours.schema';
import { CreateWorkingHoursDto, UpdateWorkingHoursDto } from './dto/create-working-hours.dto';
import { ValidationUtil } from '../common/utils/validation.util';

@Injectable()
export class WorkingHoursService {
  constructor(
    @InjectModel('WorkingHours') private readonly workingHoursModel: Model<WorkingHours>,
  ) {}

  async createWorkingHours(createDto: CreateWorkingHoursDto): Promise<WorkingHours[]> {
    // Validate schedule
    const validation = ValidationUtil.validateWorkingHours(createDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException(`Schedule validation failed: ${validation.errors.join(', ')}`);
    }

    // Delete existing working hours for this entity
    await this.workingHoursModel.deleteMany({
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId)
    });

    // Create new working hours
    const workingHours = createDto.schedule.map(schedule => ({
      entityType: createDto.entityType,
      entityId: new Types.ObjectId(createDto.entityId),
      ...schedule,
      isActive: true
    }));

    return await this.workingHoursModel.insertMany(workingHours);
  }

  async updateWorkingHours(entityType: string, entityId: string, updateDto: UpdateWorkingHoursDto): Promise<WorkingHours[]> {
    // Validate schedule
    const validation = ValidationUtil.validateWorkingHours(updateDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException(`Schedule validation failed: ${validation.errors.join(', ')}`);
    }

    // Delete existing and create new
    await this.workingHoursModel.deleteMany({
      entityType,
      entityId: new Types.ObjectId(entityId)
    });

    const workingHours = updateDto.schedule.map(schedule => ({
      entityType,
      entityId: new Types.ObjectId(entityId),
      ...schedule,
      isActive: true
    }));

    return await this.workingHoursModel.insertMany(workingHours);
  }

  async getWorkingHours(entityType: string, entityId: string): Promise<WorkingHours[]> {
    return await this.workingHoursModel.find({
      entityType,
      entityId: new Types.ObjectId(entityId),
      isActive: true
    }).exec();
  }

  async createWorkingHoursWithParentValidation(
    createDto: CreateWorkingHoursDto,
    parentEntityType?: string,
    parentEntityId?: string
  ): Promise<WorkingHours[]> {
    // Validate schedule individually first
    const validation = ValidationUtil.validateWorkingHours(createDto.schedule);
    if (!validation.isValid) {
      throw new BadRequestException(`Schedule validation failed: ${validation.errors.join(', ')}`);
    }

    // If parent entity specified, validate against parent working hours
    if (parentEntityType && parentEntityId) {
      const parentSchedule = await this.getWorkingHours(parentEntityType, parentEntityId);
      
      if (parentSchedule.length > 0) {
        const parentScheduleData = parentSchedule.map(schedule => ({
          dayOfWeek: schedule.dayOfWeek,
          isWorkingDay: schedule.isWorkingDay,
          openingTime: schedule.openingTime,
          closingTime: schedule.closingTime,
          breakStartTime: schedule.breakStartTime,
          breakEndTime: schedule.breakEndTime
        }));

        const hierarchicalValidation = ValidationUtil.validateHierarchicalWorkingHours(
          parentScheduleData,
          createDto.schedule,
          `${parentEntityType} (${parentEntityId})`,
          `${createDto.entityType} (${createDto.entityId})`
        );

        if (!hierarchicalValidation.isValid) {
          throw new BadRequestException(`Hierarchical validation failed: ${hierarchicalValidation.errors.join(', ')}`);
        }
      }
    }

    // Create working hours if validation passes
    return await this.createWorkingHours(createDto);
  }

  async validateClinicHoursWithinComplex(
    clinicId: string,
    clinicSchedule: any[],
    complexId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // Get complex working hours
    const complexSchedule = await this.getWorkingHours('complex', complexId);
    
    if (complexSchedule.length === 0) {
      // If complex has no working hours set, allow any clinic hours
      return { isValid: true, errors: [] };
    }

    const complexScheduleData = complexSchedule.map(schedule => ({
      dayOfWeek: schedule.dayOfWeek,
      isWorkingDay: schedule.isWorkingDay,
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
      breakStartTime: schedule.breakStartTime,
      breakEndTime: schedule.breakEndTime
    }));

    return ValidationUtil.validateHierarchicalWorkingHours(
      complexScheduleData,
      clinicSchedule,
      `Complex (${complexId})`,
      `Clinic (${clinicId})`
    );
  }

  async getParentEntityWorkingHours(
    childEntityType: string,
    childEntityId: string
  ): Promise<{ parentType: string; parentId: string; schedule: WorkingHours[] } | null> {
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

  async createBulkWorkingHours(schedules: any[], entityMappings: Array<{ type: string; id: string }>): Promise<void> {
    // This method would handle bulk creation during onboarding
    for (const mapping of entityMappings) {
      const entitySchedules = schedules.filter(s => s.entityType === mapping.type);
      if (entitySchedules.length > 0) {
        await this.createWorkingHours({
          entityType: mapping.type,
          entityId: mapping.id,
          schedule: entitySchedules
        });
      }
    }
  }

  async createBulkWorkingHoursWithValidation(
    schedules: any[],
    entityMappings: Array<{ type: string; id: string; parentType?: string; parentId?: string }>
  ): Promise<void> {
    // Sort entities by hierarchy (complex before clinic)
    const sortedMappings = entityMappings.sort((a, b) => {
      const hierarchy = { 'organization': 1, 'complex': 2, 'clinic': 3 };
      return (hierarchy[a.type] || 999) - (hierarchy[b.type] || 999);
    });

    for (const mapping of sortedMappings) {
      const entitySchedules = schedules.filter(s => s.entityType === mapping.type);
      if (entitySchedules.length > 0) {
        if (mapping.parentType && mapping.parentId) {
          await this.createWorkingHoursWithParentValidation(
            {
              entityType: mapping.type,
              entityId: mapping.id,
              schedule: entitySchedules
            },
            mapping.parentType,
            mapping.parentId
          );
        } else {
          await this.createWorkingHours({
            entityType: mapping.type,
            entityId: mapping.id,
            schedule: entitySchedules
          });
        }
      }
    }
  }
}
