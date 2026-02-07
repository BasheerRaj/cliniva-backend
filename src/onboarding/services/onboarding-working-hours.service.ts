import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InheritanceResult,
  WorkingHours,
  InheritanceSource,
} from '../interfaces/inheritance-result.interface';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';
import { OnboardingException } from '../exceptions/onboarding.exception';

/**
 * OnboardingWorkingHoursService
 *
 * Handles working hours inheritance logic for onboarding.
 * Implements BZR-29: Working hours inheritance from parent entities.
 *
 * Responsibilities:
 * - Get inherited working hours from parent entities
 * - Determine inheritance source (organization or complex)
 * - Validate inheritance eligibility
 * - Provide bilingual messages with source information
 *
 * Inheritance Rules:
 * - Clinic inherits from complex
 * - Complex inherits from organization (company plan only)
 * - Clinic plan: No inheritance (no parent)
 */
@Injectable()
export class OnboardingWorkingHoursService {
  private readonly logger = new Logger(OnboardingWorkingHoursService.name);

  constructor(
    @InjectModel('WorkingHours')
    private readonly workingHoursModel: Model<any>,
    @InjectModel('Organization')
    private readonly organizationModel: Model<any>,
    @InjectModel('Complex')
    private readonly complexModel: Model<any>,
  ) {}

  /**
   * Get inherited working hours for an entity
   *
   * @param subscriptionId - Subscription ID
   * @param planType - Plan type (company, complex, clinic)
   * @param complexId - Complex ID (required for clinic inheritance)
   * @returns InheritanceResult with working hours and source information
   *
   * BZR-29: Working hours inheritance
   */
  async getInheritedWorkingHours(
    subscriptionId: string,
    planType: 'company' | 'complex' | 'clinic',
    complexId?: string,
  ): Promise<InheritanceResult> {
    this.logger.log(
      `Getting inherited working hours for subscription ${subscriptionId}, plan ${planType}`,
    );

    // Validate inheritance eligibility
    if (!this.canInheritWorkingHours(planType, complexId)) {
      throw new OnboardingException(ONBOARDING_ERRORS.WORKING_HOURS_NOT_FOUND, {
        planType,
        reason: 'No parent entity available for inheritance',
      });
    }

    // Determine parent entity based on plan type
    let parentEntityType: 'organization' | 'complex';
    let parentEntityId: string;
    let parentEntityName: string;

    if (planType === 'clinic' && complexId) {
      // Clinic inherits from complex
      const complex = await this.complexModel
        .findById(new Types.ObjectId(complexId))
        .select('name')
        .lean()
        .exec();

      if (!complex) {
        throw new OnboardingException(
          ONBOARDING_ERRORS.PARENT_ENTITY_NOT_FOUND,
          {
            entityType: 'complex',
            entityId: complexId,
          },
        );
      }

      parentEntityType = 'complex';
      parentEntityId = complexId;
      parentEntityName = (complex as any).name;
    } else if (planType === 'complex') {
      // Complex inherits from organization (if exists)
      const organization = await this.organizationModel
        .findOne({ subscriptionId: new Types.ObjectId(subscriptionId) })
        .select('name')
        .lean()
        .exec();

      if (!organization) {
        throw new OnboardingException(
          ONBOARDING_ERRORS.PARENT_ENTITY_NOT_FOUND,
          {
            entityType: 'organization',
            subscriptionId,
          },
        );
      }

      parentEntityType = 'organization';
      parentEntityId = (organization as any)._id.toString();
      parentEntityName = (organization as any).name;
    } else {
      // Should not reach here due to canInheritWorkingHours check
      throw new OnboardingException(ONBOARDING_ERRORS.WORKING_HOURS_NOT_FOUND, {
        planType,
        reason: 'Invalid inheritance configuration',
      });
    }

    // Get parent working hours
    const workingHours = await this.getParentWorkingHours(
      parentEntityType,
      parentEntityId,
    );

    // Build source information
    const source: InheritanceSource = {
      entityType: parentEntityType,
      entityId: parentEntityId,
      entityName: parentEntityName,
    };

    // Return result with bilingual message
    return {
      workingHours,
      source,
      canModify: true,
      message: {
        ar: `تم استيراد ساعات العمل من ${parentEntityType === 'organization' ? 'المنظمة' : 'المجمع'}: ${parentEntityName}`,
        en: `Working hours inherited from ${parentEntityType}: ${parentEntityName}`,
      },
    };
  }

  /**
   * Get working hours for a parent entity
   *
   * @param entityType - Entity type (organization or complex)
   * @param entityId - Entity ID
   * @returns Array of working hours
   */
  async getParentWorkingHours(
    entityType: 'organization' | 'complex',
    entityId: string,
  ): Promise<WorkingHours[]> {
    this.logger.log(`Fetching working hours for ${entityType} ${entityId}`);

    const workingHoursRecords = await this.workingHoursModel
      .find({
        entityType,
        entityId: new Types.ObjectId(entityId),
        isActive: true,
      })
      .select(
        'dayOfWeek openingTime closingTime breakStartTime breakEndTime isWorkingDay',
      )
      .lean();

    if (!workingHoursRecords || workingHoursRecords.length === 0) {
      this.logger.warn(`No working hours found for ${entityType} ${entityId}`);
      throw new OnboardingException(ONBOARDING_ERRORS.WORKING_HOURS_NOT_FOUND, {
        entityType,
        entityId,
      });
    }

    // Transform to interface format
    return workingHoursRecords.map((record) => ({
      day: record.dayOfWeek,
      startTime: record.openingTime || '',
      endTime: record.closingTime || '',
      isActive: record.isWorkingDay !== false,
      breakStartTime: record.breakStartTime,
      breakEndTime: record.breakEndTime,
    }));
  }

  /**
   * Check if working hours inheritance is possible
   *
   * @param planType - Plan type
   * @param complexId - Complex ID (required for clinic)
   * @returns True if inheritance is possible
   */
  canInheritWorkingHours(
    planType: 'company' | 'complex' | 'clinic',
    complexId?: string,
  ): boolean {
    // Clinic plan with complexId can inherit from complex
    if (planType === 'clinic' && complexId) {
      return true;
    }

    // Complex plan can inherit from organization
    if (planType === 'complex') {
      return true;
    }

    // Company plan: organization is the root, no inheritance
    // Clinic plan without complexId: no parent
    return false;
  }
}
