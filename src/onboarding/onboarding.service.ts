import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Types, Model } from 'mongoose';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { ValidateOnboardingDto, OnboardingProgressDto } from './dto/validate-onboarding.dto';

// Services
import { SubscriptionService } from '../subscription/subscription.service';
import { OrganizationService } from '../organization/organization.service';
import { ComplexService } from '../complex/complex.service';
import { ClinicService } from '../clinic/clinic.service';
import { DepartmentService } from '../department/department.service';
import { ServiceService } from '../service/service.service';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { ContactService } from '../contact/contact.service';
import { DynamicInfoService } from '../dynamic-info/dynamic-info.service';
import { UserAccessService } from '../user-access/user-access.service';
import { UserRole } from '../common/enums/user-role.enum';

// Schemas
import { User } from '../database/schemas/user.schema';
import { SubscriptionPlan } from '../database/schemas/subscription-plan.schema';

// Utilities
import { ValidationUtil } from '../common/utils/validation.util';
import { EntityRelationshipUtil } from '../common/utils/entity-relationship.util';
import { PlanConfigUtil } from '../common/utils/plan-config.util';
import { DataTransformerUtil } from '../common/utils/data-transformer.util';

export interface OnboardingResult {
  success: boolean;
  userId: string;
  subscriptionId: string;
  entities: {
    organization?: any;
    complexes?: any[];
    departments?: any[];
    clinics?: any[];
    services?: any[];
  };
  errors?: string[];
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('SubscriptionPlan') private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationService: OrganizationService,
    private readonly complexService: ComplexService,
    private readonly clinicService: ClinicService,
    private readonly departmentService: DepartmentService,
    private readonly serviceService: ServiceService,
    private readonly workingHoursService: WorkingHoursService,
    private readonly contactService: ContactService,
    private readonly dynamicInfoService: DynamicInfoService,
    private readonly userAccessService: UserAccessService,
  ) {}

  async completeOnboarding(onboardingDto: CompleteOnboardingDto): Promise<OnboardingResult> {
    const session = await this.connection.startSession();
    
    try {
      session.startTransaction();

      // Step 1: Validate onboarding data
      const validation = await this.validateOnboardingData(onboardingDto);
      if (!validation.isValid) {
        throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Find or get existing user
      const user = await this.findUserByEmail(onboardingDto.userData.email);
      if (!user) {
        throw new BadRequestException('User not found. Please create an account first.');
      }
      const userId = (user._id as any).toString();

      // Step 3: Resolve plan ID from plan type
      const actualPlanId = await this.resolvePlanId(onboardingDto.subscriptionData.planType, onboardingDto.subscriptionData.planId);

      // Step 4: Create subscription
      const subscription = await this.subscriptionService.createSubscription({
        userId,
        planId: actualPlanId,
        planType: onboardingDto.subscriptionData.planType
      });

      // Step 5: Create entities based on plan type
      const entities = await this.createEntitiesByPlan(
        onboardingDto.subscriptionData.planType,
        (subscription as any).id || (subscription as any)._id?.toString() || '',
        onboardingDto
      );

      // Step 6: Create supporting entities (working hours, contacts, etc.)
      // Note: This would create working hours, contacts, and user access when services are fully implemented
      await this.createSupportingEntities(onboardingDto, entities, userId);

      // Step 7: Setup user access permissions
      await this.setupUserAccess(userId, onboardingDto.subscriptionData.planType, entities);

      await session.commitTransaction();

      return {
        success: true,
        userId,
        subscriptionId: subscription.id || subscription._id?.toString() || '',
        entities
      };

    } catch (error) {
      await session.abortTransaction();
      // Validation errors should be BadRequestException
      if (error.message.includes('Validation failed:')) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(`Onboarding failed: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email: email.toLowerCase() });
  }

  private async resolvePlanId(planType: string, planId: string): Promise<string> {
    // If planId is already a valid ObjectId, return it
    if (Types.ObjectId.isValid(planId) && planId.length === 24) {
      return planId;
    }

    // Otherwise, find plan by type name
    const plan = await this.subscriptionPlanModel.findOne({ name: planType.toLowerCase() });
    if (!plan) {
      throw new BadRequestException(`Subscription plan not found for type: ${planType}`);
    }

    return (plan._id as any).toString();
  }

  async validateOnboardingData(onboardingDto: ValidateOnboardingDto): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate plan configuration
    const planConfig = PlanConfigUtil.getPlanConfiguration(onboardingDto.subscriptionData.planType);
    if (!planConfig) {
      errors.push('Invalid plan type');
      return { isValid: false, errors };
    }

    // Validate entity hierarchy
    const entityHierarchy = {
      organization: onboardingDto.organization,
      complexes: onboardingDto.complexes || [],
      departments: onboardingDto.departments || [],
      clinics: onboardingDto.clinics || [],
      services: onboardingDto.services || []
    };

    if (!EntityRelationshipUtil.validateEntityHierarchy(onboardingDto.subscriptionData.planType, entityHierarchy)) {
      errors.push('Invalid entity hierarchy for selected plan');
    }

    // Validate plan limits
    const entityCounts = {
      organizations: onboardingDto.organization ? 1 : 0,
      complexes: onboardingDto.complexes?.length || 0,
      clinics: onboardingDto.clinics?.length || 0,
      departments: onboardingDto.departments?.length || 0,
      services: onboardingDto.services?.length || 0
    };

    const limitsValidation = PlanConfigUtil.validatePlanLimits(onboardingDto.subscriptionData.planType, entityCounts);
    if (!limitsValidation.isValid) {
      errors.push(...limitsValidation.errors);
    }

    // Validate working hours if provided
    if (onboardingDto.workingHours && onboardingDto.workingHours.length > 0) {
      const workingHoursValidation = ValidationUtil.validateWorkingHours(onboardingDto.workingHours);
      if (!workingHoursValidation.isValid) {
        errors.push(...workingHoursValidation.errors);
      }

      // Validate hierarchical working hours
      const hierarchicalValidation = this.validateWorkingHoursStructure(onboardingDto.workingHours);
      if (!hierarchicalValidation.isValid) {
        errors.push(...hierarchicalValidation.errors);
      }
    }

    // Plan-specific validations
    await this.validatePlanSpecificData(onboardingDto, errors);

    return { isValid: errors.length === 0, errors };
  }

  private async validatePlanSpecificData(onboardingDto: CompleteOnboardingDto, errors: string[]): Promise<void> {
    const planType = onboardingDto.subscriptionData.planType.toLowerCase();

    // Validate VAT number if provided
    if (onboardingDto.organization?.legalInfo?.vatNumber) {
      if (!ValidationUtil.validateVATNumber(onboardingDto.organization.legalInfo.vatNumber)) {
        errors.push('Invalid VAT number format');
      }
    }

    // Validate business profile for clinics
    if (planType === 'clinic' && onboardingDto.clinics) {
      for (const clinic of onboardingDto.clinics) {
        if (clinic.businessProfile) {
          const profileValidation = ValidationUtil.validateBusinessProfile(clinic.businessProfile);
          if (!profileValidation.isValid) {
            errors.push(...profileValidation.errors);
          }
        }
        if (clinic.legalInfo?.vatNumber && !ValidationUtil.validateVATNumber(clinic.legalInfo.vatNumber)) {
          errors.push('Invalid VAT number format');
        }
        if (clinic.legalInfo?.crNumber && !ValidationUtil.validateCRNumber(clinic.legalInfo.crNumber)) {
          errors.push('Invalid Commercial Registration number format');
        }
      }
    }

    switch (planType) {
      case 'company':
        if (!onboardingDto.organization) {
          errors.push('Company plan requires organization data');
        }
        break;

      case 'complex':
        if (!onboardingDto.complexes || onboardingDto.complexes.length === 0) {
          errors.push('Complex plan requires at least one complex');
        }
        if (!onboardingDto.departments || onboardingDto.departments.length === 0) {
          errors.push('Complex plan requires at least one department');
        }
        break;

      case 'clinic':
        if (!onboardingDto.clinics || onboardingDto.clinics.length === 0) {
          errors.push('Clinic plan requires at least one clinic');
        } else {
          // Validate clinic-specific requirements
          const clinic = onboardingDto.clinics[0];
          if (clinic.capacity?.maxPatients == null) {
            errors.push('Clinic plan requires maximum patient capacity');
          }
          if (clinic.capacity?.sessionDuration == null) {
            errors.push('Clinic plan requires default session duration');
          }
        }
        break;
    }
  }

  private async createEntitiesByPlan(
    planType: string,
    subscriptionId: string,
    onboardingDto: CompleteOnboardingDto
  ): Promise<any> {
    const entities: any = {};

    switch (planType.toLowerCase()) {
      case 'company':
        entities.organization = await this.createCompanyPlanEntities(subscriptionId, onboardingDto);
        break;

      case 'complex':
        const complexEntities = await this.createComplexPlanEntities(subscriptionId, onboardingDto);
        entities.complexes = complexEntities.complexes;
        entities.departments = complexEntities.departments;
        entities.clinics = complexEntities.clinics;
        break;

      case 'clinic':
        entities.clinics = await this.createClinicPlanEntities(subscriptionId, onboardingDto);
        break;
    }

    // Create services if provided (applies to any plan that supplies services)
    if (onboardingDto.services && onboardingDto.services.length > 0) {
      entities.services = [] as any[];
      for (const serviceData of onboardingDto.services) {
        // Determine the appropriate parent entity for the service
        let serviceDto;
        
        if (planType === 'clinic' && entities.clinics?.length > 0) {
          // For clinic plan, link services directly to clinic
          serviceDto = {
            ...serviceData,
            clinicId: entities.clinics[0].id || entities.clinics[0]._id?.toString(),
            complexDepartmentId: undefined // Not needed for clinic plan
          };
        } else if (serviceData.complexDepartmentId) {
          // For complex/company plans with department specified
          serviceDto = serviceData;
        } else {
          // Skip services without proper parent entity
          console.warn(`Skipping service ${serviceData.name} - no valid parent entity`);
          continue;
        }

        try {
          const createdService = await this.serviceService.createService(serviceDto);
          entities.services.push(createdService);
        } catch (error) {
          console.error(`Failed to create service ${serviceData.name}:`, error);
          // Continue with other services even if one fails
        }
      }
    }

    return entities;
  }

  private async createCompanyPlanEntities(subscriptionId: string, onboardingDto: CompleteOnboardingDto): Promise<any> {
    // Create organization
    const organizationData = onboardingDto.organization;
    if (!organizationData?.name) {
      throw new BadRequestException('Organization name is required for company plan');
    }
    
    const organization = await this.organizationService.createOrganization({
      subscriptionId,
      name: organizationData.name,
      legalName: organizationData.legalName,
      registrationNumber: organizationData.registrationNumber,
      phone: organizationData.phone,
      email: organizationData.email,
      address: organizationData.address,
      googleLocation: organizationData.googleLocation,
      logoUrl: organizationData.logoUrl,
      website: organizationData.website,
      yearEstablished: organizationData.businessProfile?.yearEstablished,
      mission: organizationData.businessProfile?.mission,
      vision: organizationData.businessProfile?.vision,
      ceoName: organizationData.businessProfile?.ceoName,
      vatNumber: organizationData.legalInfo?.vatNumber,
      crNumber: organizationData.legalInfo?.crNumber
    });

    const entities = { organization, complexes: [] as any[], departments: [] as any[], clinics: [] as any[] };

    // Create complexes if provided
    if (onboardingDto.complexes && onboardingDto.complexes.length > 0) {
      for (const complexData of onboardingDto.complexes) {
        const complex = await this.complexService.createComplex({
          organizationId: (organization as any).id || (organization as any)._id?.toString() || '',
          subscriptionId,
          ...complexData
        });
        entities.complexes.push(complex);

        // Create departments and link to complex
        if (complexData.departmentIds && complexData.departmentIds.length > 0) {
          await this.createDepartmentsForComplex((complex as any).id || (complex as any)._id?.toString() || '', complexData.departmentIds);
        }
      }
    }

    // Create clinics if provided
    if (onboardingDto.clinics && onboardingDto.clinics.length > 0) {
      for (const clinicData of onboardingDto.clinics) {
        // Flatten the nested structure to match CreateClinicDto
        const flattenedClinicData = {
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

        const clinic = await this.clinicService.createClinic(flattenedClinicData);
        entities.clinics.push(clinic);
      }
    }

    return entities;
  }

  private async createComplexPlanEntities(subscriptionId: string, onboardingDto: CompleteOnboardingDto): Promise<any> {
    const entities = { complexes: [] as any[], departments: [] as any[], clinics: [] as any[] };

    if (onboardingDto.complexes && onboardingDto.complexes.length > 0) {
      for (const complexData of onboardingDto.complexes) {
        const complex = await this.complexService.createComplex({
          subscriptionId,
          ...complexData
        });
        entities.complexes.push(complex);

        // Create departments and link to complex
        if (complexData.departmentIds && complexData.departmentIds.length > 0) {
          await this.createDepartmentsForComplex((complex as any).id || (complex as any)._id?.toString() || '', complexData.departmentIds);
        }
      }
    }

    // Create clinics if provided
    if (onboardingDto.clinics && onboardingDto.clinics.length > 0) {
      for (const clinicData of onboardingDto.clinics) {
        // Flatten the nested structure to match CreateClinicDto
        const flattenedClinicData = {
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

        const clinic = await this.clinicService.createClinic(flattenedClinicData);
        entities.clinics.push(clinic);
      }
    }

    return entities;
  }

  private async createClinicPlanEntities(subscriptionId: string, onboardingDto: CompleteOnboardingDto): Promise<any[]> {
    const clinics: any[] = [];

    if (onboardingDto.clinics && onboardingDto.clinics.length > 0) {
      for (const clinicData of onboardingDto.clinics) {
        // Flatten the nested structure to match CreateClinicDto
        const flattenedClinicData = {
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

        const clinic = await this.clinicService.createClinic(flattenedClinicData);
        clinics.push(clinic);
      }
    }

    return clinics;
  }

  private async createDepartmentsForComplex(complexId: string, departmentIds: string[]): Promise<void> {
    for (const departmentId of departmentIds) {
      await this.departmentService.createComplexDepartment(complexId, departmentId);
    }
  }

  private async createSupportingEntities(onboardingDto: CompleteOnboardingDto, entities: any, userId: string): Promise<void> {
    // Create working hours if provided
    if (onboardingDto.workingHours && onboardingDto.workingHours.length > 0) {
      // Validate hierarchical working hours structure
      const validation = this.validateWorkingHoursStructure(onboardingDto.workingHours);
      if (!validation.isValid) {
        throw new BadRequestException(`Working hours validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Create working hours with hierarchical validation
      await this.createHierarchicalWorkingHours(onboardingDto.workingHours, entities);
    }

    // Create contacts and social media entries if provided
    if (onboardingDto.contacts && onboardingDto.contacts.length > 0) {
      const entityMappings = this.buildEntityMappings(entities);
      await this.contactService.createBulkContacts(onboardingDto.contacts, entityMappings);
    }

    // Create legal documents (terms, privacy policy) if provided
    if (onboardingDto.legalInfo) {
      const entityMappings = this.buildEntityMappings(entities);
      await this.dynamicInfoService.createLegalDocuments(onboardingDto.legalInfo, entityMappings);
    }
  }

  private buildEntityMappings(entities: any): Array<{ type: string; id: string }> {
    const mappings: Array<{ type: string; id: string }> = [];

    if (entities.organization) {
      mappings.push({ type: 'organization', id: entities.organization.id || entities.organization._id?.toString() || '' });
    }

    if (entities.complexes && Array.isArray(entities.complexes)) {
      entities.complexes.forEach((complex: any) => {
        mappings.push({ type: 'complex', id: complex.id || complex._id?.toString() || '' });
      });
    }

    if (entities.clinics && Array.isArray(entities.clinics)) {
      entities.clinics.forEach((clinic: any) => {
        mappings.push({ type: 'clinic', id: clinic.id || clinic._id?.toString() || '' });
      });
    }

    return mappings;
  }

  private validateWorkingHoursStructure(workingHours: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Group working hours by entity type and day
    const hoursByEntityAndDay = new Map<string, Map<string, any>>();
    
    workingHours.forEach(wh => {
      const entityKey = `${wh.entityType || 'unknown'}_${wh.entityName || 'unknown'}`;
      if (!hoursByEntityAndDay.has(entityKey)) {
        hoursByEntityAndDay.set(entityKey, new Map());
      }
      hoursByEntityAndDay.get(entityKey)!.set(wh.dayOfWeek, wh);
    });

    // Validate hierarchical constraints
    const organizationHours = new Map<string, any>();
    const complexHours = new Map<string, any>();
    const clinicHours = new Map<string, any>();

    // Collect hours by type
    for (const [entityKey, dayMap] of hoursByEntityAndDay) {
      if (entityKey.startsWith('organization_')) {
        for (const [day, hours] of dayMap) {
          organizationHours.set(day, hours);
        }
      } else if (entityKey.startsWith('complex_')) {
        for (const [day, hours] of dayMap) {
          complexHours.set(day, hours);
        }
      } else if (entityKey.startsWith('clinic_')) {
        for (const [day, hours] of dayMap) {
          clinicHours.set(day, hours);
        }
      }
    }

    // Validate complex hours against organization hours
    for (const [day, complexDay] of complexHours) {
      const orgDay = organizationHours.get(day);
      if (orgDay && complexDay.isWorkingDay && !orgDay.isWorkingDay) {
        errors.push(`Complex cannot be open on ${day} when Organization is closed`);
      }
      if (orgDay && complexDay.isWorkingDay && orgDay.isWorkingDay) {
        const validation = ValidationUtil.validateHierarchicalWorkingHours(
          [orgDay], [complexDay], 'Organization', 'Complex'
        );
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    }

    // Validate clinic hours against complex hours
    for (const [day, clinicDay] of clinicHours) {
      const complexDay = complexHours.get(day);
      if (complexDay && clinicDay.isWorkingDay && !complexDay.isWorkingDay) {
        errors.push(`Clinic cannot be open on ${day} when Complex is closed`);
      }
      if (complexDay && clinicDay.isWorkingDay && complexDay.isWorkingDay) {
        const validation = ValidationUtil.validateHierarchicalWorkingHours(
          [complexDay], [clinicDay], 'Complex', 'Clinic'
        );
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private async setupUserAccess(userId: string, planType: string, entities: any): Promise<void> {
    // Create user access records based on plan type and created entities
    const entityMappings = this.buildEntityMappingsWithHierarchy(entities);
    
    for (const mapping of entityMappings) {
      await this.userAccessService.createUserAccess(
        userId,
        mapping.type,
        mapping.id,
        UserRole.OWNER
      );
    }
  }

  private async createHierarchicalWorkingHours(workingHours: any[], entities: any): Promise<void> {
    const entityMappings = this.buildEntityMappingsWithHierarchy(entities);
    
    // Group working hours by entity
    const workingHoursByEntity = new Map<string, any[]>();
    
    for (const wh of workingHours) {
      // Find entity mapping by name and type
      const entityMapping = entityMappings.find(m => 
        m.name === wh.entityName && m.type === wh.entityType
      );
      
      if (entityMapping) {
        const key = `${entityMapping.type}-${entityMapping.id}`;
        if (!workingHoursByEntity.has(key)) {
          workingHoursByEntity.set(key, []);
        }
        
        // Add entityName to working hours data for mapping
        workingHoursByEntity.get(key)!.push({
          dayOfWeek: wh.dayOfWeek,
          isWorkingDay: wh.isWorkingDay,
          openingTime: wh.openingTime,
          closingTime: wh.closingTime,
          breakStartTime: wh.breakStartTime,
          breakEndTime: wh.breakEndTime,
          entityName: wh.entityName // Keep for reference
        });
      } else {
        console.warn(`Could not find entity mapping for ${wh.entityType}: ${wh.entityName}`);
      }
    }
    
    // Create working hours for each entity
    for (const [key, schedule] of workingHoursByEntity) {
      const [entityType, entityId] = key.split('-');
      
      try {
        await this.workingHoursService.createWorkingHours({
          entityType,
          entityId,
          schedule: schedule.map(s => ({
            dayOfWeek: s.dayOfWeek,
            isWorkingDay: s.isWorkingDay,
            openingTime: s.openingTime,
            closingTime: s.closingTime,
            breakStartTime: s.breakStartTime,
            breakEndTime: s.breakEndTime
          }))
        });
      } catch (error) {
        console.error(`Failed to create working hours for ${entityType} ${entityId}:`, error);
        // Continue with other entities even if one fails
      }
    }
  }

  private buildEntityMappingsWithHierarchy(entities: any): Array<{ type: string; id: string; name: string }> {
    const mappings: Array<{ type: string; id: string; name: string }> = [];

    if (entities.organization) {
      mappings.push({ 
        type: 'organization', 
        id: entities.organization.id || entities.organization._id?.toString() || '',
        name: entities.organization.name
      });
    }

    if (entities.complexes && Array.isArray(entities.complexes)) {
      entities.complexes.forEach((complex: any) => {
        mappings.push({ 
          type: 'complex', 
          id: complex.id || complex._id?.toString() || '',
          name: complex.name
        });
      });
    }

    if (entities.clinics && Array.isArray(entities.clinics)) {
      entities.clinics.forEach((clinic: any) => {
        mappings.push({ 
          type: 'clinic', 
          id: clinic.id || clinic._id?.toString() || '',
          name: clinic.name
        });
      });
    }

    return mappings;
  }

  private getDefaultPermissionsForPlan(planType: string): string[] {
    switch (planType.toLowerCase()) {
      case 'company':
        return ['read', 'write', 'delete', 'admin'];
      case 'complex':
        return ['read', 'write'];
      case 'clinic':
        return ['read', 'write'];
      default:
        return ['read'];
    }
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingProgressDto | null> {
    // This would typically be stored in a separate progress tracking table
    // For now, we'll return null - this would be implemented based on requirements
    return null;
  }
}
