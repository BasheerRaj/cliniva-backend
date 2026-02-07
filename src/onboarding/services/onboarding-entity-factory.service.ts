import { Injectable, BadRequestException } from '@nestjs/common';
import { OrganizationService } from '../../organization/organization.service';
import { ComplexService } from '../../complex/complex.service';
import { ClinicService } from '../../clinic/clinic.service';
import { ONBOARDING_ERRORS } from '../constants/onboarding-errors.constant';
import { EntityResult } from '../interfaces/entity-result.interface';
import {
  CompleteOnboardingDto,
  OrganizationDto,
  ComplexDto,
  ClinicDto,
} from '../dto/complete-onboarding.dto';

/**
 * OnboardingEntityFactoryService
 *
 * Responsibility: Unified entity creation for all plan types (DRY principle)
 *
 * This service eliminates code duplication by providing a single source of truth
 * for entity creation across company, complex, and clinic plans.
 */
@Injectable()
export class OnboardingEntityFactoryService {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly complexService: ComplexService,
    private readonly clinicService: ClinicService,
  ) {}

  /**
   * Create entities for a specific plan type
   *
   * This is the main entry point that eliminates duplication across
   * createCompanyPlanEntities, createComplexPlanEntities, and createClinicPlanEntities
   *
   * @param planType - The subscription plan type
   * @param subscriptionId - The subscription ID
   * @param dto - The complete onboarding DTO
   * @param userId - The user ID
   * @returns EntityResult with created entities
   */
  async createEntitiesForPlan(
    planType: 'company' | 'complex' | 'clinic',
    subscriptionId: string,
    dto: CompleteOnboardingDto,
    userId: string,
  ): Promise<EntityResult> {
    const result: EntityResult = {
      createdEntities: [],
    };

    switch (planType) {
      case 'company':
        return await this.createCompanyPlanEntities(
          subscriptionId,
          dto,
          userId,
          result,
        );

      case 'complex':
        return await this.createComplexPlanEntities(
          subscriptionId,
          dto,
          result,
        );

      case 'clinic':
        return await this.createClinicPlanEntities(subscriptionId, dto, result);

      default:
        throw new BadRequestException({
          message: ONBOARDING_ERRORS.INVALID_PLAN_TYPE.message,
          code: ONBOARDING_ERRORS.INVALID_PLAN_TYPE.code,
        });
    }
  }

  /**
   * Create organization entity
   *
   * @param subscriptionId - The subscription ID
   * @param data - Organization data
   * @param userId - The user ID
   * @returns Created organization
   */
  async createOrganization(
    subscriptionId: string,
    data: OrganizationDto,
    userId: string,
  ): Promise<any> {
    if (!data?.name) {
      throw new BadRequestException({
        message: {
          ar: 'اسم المنظمة مطلوب',
          en: 'Organization name is required',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    return await this.organizationService.createOrganization(
      {
        subscriptionId,
        name: data.name,
        legalName: data.legalName,
        registrationNumber: data.registrationNumber,
        phone: data.phone,
        email: data.email,
        address: data.address,
        googleLocation: data.googleLocation,
        logoUrl: data.logoUrl,
        website: data.website,
        yearEstablished: data.businessProfile?.yearEstablished,
        mission: data.businessProfile?.mission,
        vision: data.businessProfile?.vision,
        ceoName: data.businessProfile?.ceoName,
        vatNumber: data.legalInfo?.vatNumber,
        crNumber: data.legalInfo?.crNumber,
      },
      userId,
    );
  }

  /**
   * Create complex entity
   *
   * @param subscriptionId - The subscription ID
   * @param data - Complex data
   * @param organizationId - Optional organization ID for company plan
   * @returns Created complex
   */
  async createComplex(
    subscriptionId: string,
    data: ComplexDto,
    organizationId?: string,
  ): Promise<any> {
    if (!data?.name) {
      throw new BadRequestException({
        message: {
          ar: 'اسم المجمع مطلوب',
          en: 'Complex name is required',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    const complexData: any = {
      subscriptionId,
      name: data.name,
      address: data.address,
      googleLocation: data.googleLocation,
      phone: data.phone,
      email: data.email,
      logoUrl: data.logoUrl,
      website: data.website,
      managerName: data.managerName,
      departmentIds: data.departmentIds,
    };

    // Add organization ID if provided (company plan)
    if (organizationId) {
      complexData.organizationId = organizationId;
    }

    return await this.complexService.createComplex(complexData);
  }

  /**
   * Create clinic entity
   *
   * @param subscriptionId - The subscription ID
   * @param data - Clinic data
   * @returns Created clinic
   */
  async createClinic(subscriptionId: string, data: ClinicDto): Promise<any> {
    if (!data?.name) {
      throw new BadRequestException({
        message: {
          ar: 'اسم العيادة مطلوب',
          en: 'Clinic name is required',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    // Use the flattened data helper
    const flattenedData = this.flattenClinicData(subscriptionId, data);
    return await this.clinicService.createClinic(flattenedData);
  }

  /**
   * Flatten clinic data from nested structure to flat DTO
   *
   * This helper eliminates the duplication of flattening logic that appeared
   * in all three plan-specific entity creation methods
   *
   * @param subscriptionId - The subscription ID
   * @param clinicData - Nested clinic data
   * @returns Flattened clinic DTO
   */
  flattenClinicData(subscriptionId: string, clinicData: ClinicDto): any {
    return {
      subscriptionId,
      name: clinicData.name,
      address: clinicData.address,
      googleLocation: clinicData.googleLocation,
      phone: clinicData.phone,
      email: clinicData.email,
      licenseNumber: clinicData.licenseNumber,
      logoUrl: clinicData.logoUrl,
      website: clinicData.website,
      headDoctorName: clinicData.headDoctorName,
      specialization: clinicData.specialization,
      pin: clinicData.pin,
      complexDepartmentId: clinicData.complexDepartmentId,
      // Flatten capacity fields
      maxStaff: clinicData.capacity?.maxStaff,
      maxDoctors: clinicData.capacity?.maxDoctors,
      maxPatients: clinicData.capacity?.maxPatients,
      sessionDuration: clinicData.capacity?.sessionDuration,
      // Flatten business profile fields
      yearEstablished: clinicData.businessProfile?.yearEstablished,
      mission: clinicData.businessProfile?.mission,
      vision: clinicData.businessProfile?.vision,
      ceoName: clinicData.businessProfile?.ceoName,
      // Flatten legal info fields
      vatNumber: clinicData.legalInfo?.vatNumber,
      crNumber: clinicData.legalInfo?.crNumber,
    };
  }

  /**
   * Create entities for company plan
   *
   * Company plan hierarchy: Organization → Complexes → Clinics
   *
   * @private
   */
  private async createCompanyPlanEntities(
    subscriptionId: string,
    dto: CompleteOnboardingDto,
    userId: string,
    result: EntityResult,
  ): Promise<EntityResult> {
    // Create organization
    if (!dto.organization) {
      throw new BadRequestException({
        message: {
          ar: 'بيانات المنظمة مطلوبة لخطة الشركة',
          en: 'Organization data is required for company plan',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    const organization = await this.createOrganization(
      subscriptionId,
      dto.organization,
      userId,
    );
    result.organization = organization;
    result.createdEntities.push('organization');

    const organizationId =
      organization.id || organization._id?.toString() || '';

    // Create complexes if provided
    if (dto.complexes && dto.complexes.length > 0) {
      result.complexes = [];
      for (const complexData of dto.complexes) {
        const complex = await this.createComplex(
          subscriptionId,
          complexData,
          organizationId,
        );
        result.complexes.push(complex);
        result.createdEntities.push('complex');
      }
    }

    // Create clinics if provided
    if (dto.clinics && dto.clinics.length > 0) {
      result.clinics = [];
      for (const clinicData of dto.clinics) {
        const clinic = await this.createClinic(subscriptionId, clinicData);
        result.clinics.push(clinic);
        result.createdEntities.push('clinic');
      }
    }

    return result;
  }

  /**
   * Create entities for complex plan
   *
   * Complex plan hierarchy: Complexes → Clinics
   *
   * @private
   */
  private async createComplexPlanEntities(
    subscriptionId: string,
    dto: CompleteOnboardingDto,
    result: EntityResult,
  ): Promise<EntityResult> {
    // Create complexes
    if (!dto.complexes || dto.complexes.length === 0) {
      throw new BadRequestException({
        message: {
          ar: 'بيانات المجمع مطلوبة لخطة المجمع',
          en: 'Complex data is required for complex plan',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    result.complexes = [];
    for (const complexData of dto.complexes) {
      const complex = await this.createComplex(subscriptionId, complexData);
      result.complexes.push(complex);
      result.createdEntities.push('complex');
    }

    // Create clinics if provided
    if (dto.clinics && dto.clinics.length > 0) {
      result.clinics = [];
      for (const clinicData of dto.clinics) {
        const clinic = await this.createClinic(subscriptionId, clinicData);
        result.clinics.push(clinic);
        result.createdEntities.push('clinic');
      }
    }

    return result;
  }

  /**
   * Create entities for clinic plan
   *
   * Clinic plan hierarchy: Clinic only
   *
   * @private
   */
  private async createClinicPlanEntities(
    subscriptionId: string,
    dto: CompleteOnboardingDto,
    result: EntityResult,
  ): Promise<EntityResult> {
    // Create clinics
    if (!dto.clinics || dto.clinics.length === 0) {
      throw new BadRequestException({
        message: {
          ar: 'بيانات العيادة مطلوبة لخطة العيادة',
          en: 'Clinic data is required for clinic plan',
        },
        code: 'ONBOARDING_VALIDATION_FAILED',
      });
    }

    result.clinics = [];
    for (const clinicData of dto.clinics) {
      const clinic = await this.createClinic(subscriptionId, clinicData);
      result.clinics.push(clinic);
      result.createdEntities.push('clinic');
    }

    return result;
  }
}
