import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from '../../database/schemas/organization.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { Clinic } from '../../database/schemas/clinic.schema';
import { LimitResult } from '../interfaces/limit-result.interface';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';

/**
 * Entity Type Enum
 *
 * Defines the types of entities that can be created during onboarding.
 */
export type EntityType = 'organization' | 'complex' | 'clinic';

/**
 * Plan Type Enum
 *
 * Defines the subscription plan types.
 */
export type PlanType = 'company' | 'complex' | 'clinic';

/**
 * OnboardingPlanLimitService
 *
 * Responsible for enforcing plan limits during onboarding.
 * Implements business rules BZR-26, BZR-28, and BZR-30.
 *
 * Business Rules:
 * - BZR-26: Company plan allows maximum 1 organization
 * - BZR-28: Complex plan allows maximum 1 complex
 * - BZR-30: Clinic plan allows maximum 1 clinic
 *
 * Key Features:
 * - Validates entity creation against plan limits
 * - Counts non-soft-deleted entities only
 * - Returns bilingual error messages
 * - Supports all three plan types
 */
@Injectable()
export class OnboardingPlanLimitService {
  private readonly logger = new Logger(OnboardingPlanLimitService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>,
    @InjectModel(Complex.name)
    private readonly complexModel: Model<Complex>,
    @InjectModel(Clinic.name)
    private readonly clinicModel: Model<Clinic>,
  ) {}

  /**
   * Validate Plan Limit
   *
   * Validates if a new entity can be created based on plan limits.
   *
   * @param subscriptionId - The subscription ID
   * @param entityType - The type of entity to create
   * @param planType - The subscription plan type
   * @returns LimitResult with validation status and details
   *
   * @example
   * ```typescript
   * const result = await service.validatePlanLimit(
   *   subscriptionId,
   *   'organization',
   *   'company'
   * );
   * if (!result.canCreate) {
   *   throw new OnboardingException(result.message);
   * }
   * ```
   */
  async validatePlanLimit(
    subscriptionId: string | Types.ObjectId,
    entityType: EntityType,
    planType: PlanType,
  ): Promise<LimitResult> {
    this.logger.log(
      `Validating plan limit for ${entityType} in ${planType} plan`,
    );

    // Get current entity count
    const currentCount = await this.getEntityCount(subscriptionId, entityType);

    // Determine max allowed based on plan type and entity type
    const maxAllowed = this.getMaxAllowed(planType, entityType);

    // Check if can create
    const canCreate = currentCount < maxAllowed;

    // Build result
    const result: LimitResult = {
      canCreate,
      currentCount,
      maxAllowed,
      planType,
    };

    // Add error message if limit reached
    if (!canCreate) {
      result.message = this.getLimitErrorMessage(entityType);
      this.logger.warn(
        `Plan limit reached for ${entityType}: ${currentCount}/${maxAllowed}`,
      );
    }

    return result;
  }

  /**
   * Get Entity Count
   *
   * Counts non-soft-deleted entities for a subscription.
   * Excludes entities with deletedAt timestamp.
   *
   * @param subscriptionId - The subscription ID
   * @param entityType - The type of entity to count
   * @returns The count of active entities
   *
   * @example
   * ```typescript
   * const count = await service.getEntityCount(subscriptionId, 'clinic');
   * console.log(`Active clinics: ${count}`);
   * ```
   */
  async getEntityCount(
    subscriptionId: string | Types.ObjectId,
    entityType: EntityType,
  ): Promise<number> {
    const subscriptionObjectId =
      typeof subscriptionId === 'string'
        ? new Types.ObjectId(subscriptionId)
        : subscriptionId;

    const query = {
      subscriptionId: subscriptionObjectId,
      deletedAt: { $exists: false }, // Exclude soft-deleted entities
    };

    let count: number;

    switch (entityType) {
      case 'organization':
        count = await this.organizationModel.countDocuments(query);
        break;
      case 'complex':
        count = await this.complexModel.countDocuments(query);
        break;
      case 'clinic':
        count = await this.clinicModel.countDocuments(query);
        break;
      default:
        this.logger.error(`Unknown entity type: ${entityType}`);
        count = 0;
    }

    this.logger.debug(
      `Entity count for ${entityType}: ${count} (subscription: ${subscriptionId})`,
    );

    return count;
  }

  /**
   * Can Create Entity
   *
   * Checks if a new entity can be created based on plan limits.
   * Convenience method that returns a boolean.
   *
   * @param subscriptionId - The subscription ID
   * @param entityType - The type of entity to create
   * @param planType - The subscription plan type
   * @returns True if entity can be created, false otherwise
   *
   * @example
   * ```typescript
   * const canCreate = await service.canCreateEntity(
   *   subscriptionId,
   *   'complex',
   *   'complex'
   * );
   * if (!canCreate) {
   *   throw new Error('Cannot create complex: limit reached');
   * }
   * ```
   */
  async canCreateEntity(
    subscriptionId: string | Types.ObjectId,
    entityType: EntityType,
    planType: PlanType,
  ): Promise<boolean> {
    const result = await this.validatePlanLimit(
      subscriptionId,
      entityType,
      planType,
    );
    return result.canCreate;
  }

  /**
   * Get Max Allowed
   *
   * Returns the maximum number of entities allowed for a plan type.
   *
   * Plan Limits:
   * - Company plan: 1 organization, unlimited complex/clinic
   * - Complex plan: 1 complex, unlimited clinic
   * - Clinic plan: 1 clinic
   *
   * @param planType - The subscription plan type
   * @param entityType - The type of entity
   * @returns The maximum allowed count
   *
   * @private
   */
  private getMaxAllowed(planType: PlanType, entityType: EntityType): number {
    // Company plan limits
    if (planType === 'company') {
      if (entityType === 'organization') return 1; // BZR-26
      return Number.MAX_SAFE_INTEGER; // Unlimited complex/clinic
    }

    // Complex plan limits
    if (planType === 'complex') {
      if (entityType === 'complex') return 1; // BZR-28
      if (entityType === 'clinic') return Number.MAX_SAFE_INTEGER; // Unlimited clinics
      return 0; // No organization allowed
    }

    // Clinic plan limits
    if (planType === 'clinic') {
      if (entityType === 'clinic') return 1; // BZR-30
      return 0; // No organization or complex allowed
    }

    // Unknown plan type
    this.logger.error(`Unknown plan type: ${planType}`);
    return 0;
  }

  /**
   * Get Limit Error Message
   *
   * Returns the appropriate bilingual error message for limit violations.
   *
   * @param entityType - The type of entity
   * @returns Bilingual error message
   *
   * @private
   */
  private getLimitErrorMessage(entityType: EntityType) {
    switch (entityType) {
      case 'organization':
        return ONBOARDING_ERRORS.PLAN_LIMIT_COMPANY.message;
      case 'complex':
        return ONBOARDING_ERRORS.PLAN_LIMIT_COMPLEX.message;
      case 'clinic':
        return ONBOARDING_ERRORS.PLAN_LIMIT_CLINIC.message;
      default:
        return {
          ar: 'تم الوصول إلى الحد الأقصى للكيانات',
          en: 'Entity limit reached',
        };
    }
  }
}
