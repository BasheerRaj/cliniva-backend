import { Injectable } from '@nestjs/common';

export interface EntityHierarchy {
  organization?: any;
  complexes?: any[];
  departments?: any[];
  clinics?: any[];
  services?: any[];
}

export interface EntityStructure {
  planType: string;
  entities: {
    organization?: any;
    complexes: any[];
    departments: any[];
    clinics: any[];
    services: any[];
    workingHours: any[];
    contacts: any[];
    dynamicInfo: any[];
  };
}

@Injectable()
export class EntityRelationshipUtil {
  static validateEntityHierarchy(
    planType: string,
    entities: EntityHierarchy,
  ): boolean {
    switch (planType.toLowerCase()) {
      case 'company':
        return this.validateCompanyPlanHierarchy(entities);
      case 'complex':
        return this.validateComplexPlanHierarchy(entities);
      case 'clinic':
        return this.validateClinicPlanHierarchy(entities);
      default:
        return false;
    }
  }

  private static validateCompanyPlanHierarchy(
    entities: EntityHierarchy,
  ): boolean {
    // Company plan: Must have organization, can have multiple complexes and clinics
    if (!entities.organization) return false;

    // If complexes exist, they should have departments
    if (entities.complexes && entities.complexes.length > 0) {
      return !!(entities.departments && entities.departments.length > 0);
    }

    return true;
  }

  private static validateComplexPlanHierarchy(
    entities: EntityHierarchy,
  ): boolean {
    // Complex plan: Must have at least one complex, departments, and can have clinics
    if (!entities.complexes || entities.complexes.length === 0) return false;
    if (!entities.departments || entities.departments.length === 0)
      return false;

    return true;
  }

  private static validateClinicPlanHierarchy(
    entities: EntityHierarchy,
  ): boolean {
    // Clinic plan: Must have at least one clinic
    if (!entities.clinics || entities.clinics.length === 0) return false;

    return true;
  }

  static getRequiredEntitiesForPlan(planType: string): string[] {
    const entityRequirements = {
      company: ['organization'],
      complex: ['complex', 'department'],
      clinic: ['clinic'],
    };

    return entityRequirements[planType.toLowerCase()] || [];
  }

  static validateEntityDependencies(
    entityType: string,
    dependencies: any[],
  ): boolean {
    const dependencyRules = {
      organization: [], // No dependencies
      complex: ['subscription'], // Can optionally depend on organization
      clinic: ['subscription'], // Can optionally depend on complex-department
      department: [], // No dependencies
      complexDepartment: ['complex', 'department'],
      service: ['complexDepartment'],
      clinicService: ['clinic', 'service'],
      workingHours: ['entity'], // Depends on any entity (organization, complex, clinic)
      contact: ['entity'], // Depends on any entity
      dynamicInfo: ['entity'], // Depends on any entity
      userAccess: ['user', 'entity'], // Depends on user and entity
    };

    const requiredDependencies = dependencyRules[entityType] || [];

    // Check if all required dependencies are provided
    return requiredDependencies.every((dep) => {
      if (dep === 'entity') {
        // For supporting entities, any entity ID is acceptable
        return dependencies.some((d) => d && typeof d === 'string');
      }
      return dependencies.some((d) => d && d.type === dep);
    });
  }

  static generateEntityStructure(
    planType: string,
    inputData: any,
  ): EntityStructure {
    const structure: EntityStructure = {
      planType: planType.toLowerCase(),
      entities: {
        complexes: [],
        departments: [],
        clinics: [],
        services: [],
        workingHours: [],
        contacts: [],
        dynamicInfo: [],
      },
    };

    switch (planType.toLowerCase()) {
      case 'company':
        structure.entities.organization = inputData.organization;
        structure.entities.complexes = inputData.complexes || [];
        structure.entities.departments = inputData.departments || [];
        structure.entities.clinics = inputData.clinics || [];
        break;

      case 'complex':
        structure.entities.complexes = inputData.complexes || [
          inputData.complex,
        ];
        structure.entities.departments = inputData.departments || [];
        structure.entities.clinics = inputData.clinics || [];
        break;

      case 'clinic':
        structure.entities.clinics = inputData.clinics || [inputData.clinic];
        break;
    }

    // Add supporting entities for all plans
    structure.entities.services = inputData.services || [];
    structure.entities.workingHours = inputData.workingHours || [];
    structure.entities.contacts = inputData.contacts || [];
    structure.entities.dynamicInfo = inputData.dynamicInfo || [];

    return structure;
  }

  static getEntityCreationOrder(planType: string): string[] {
    const creationOrder = {
      company: [
        'subscription',
        'organization',
        'complex',
        'department',
        'complexDepartment',
        'clinic',
        'service',
        'clinicService',
        'workingHours',
        'contact',
        'dynamicInfo',
        'userAccess',
      ],
      complex: [
        'subscription',
        'complex',
        'department',
        'complexDepartment',
        'clinic',
        'service',
        'clinicService',
        'workingHours',
        'contact',
        'dynamicInfo',
        'userAccess',
      ],
      clinic: [
        'subscription',
        'clinic',
        'service',
        'clinicService',
        'workingHours',
        'contact',
        'dynamicInfo',
        'userAccess',
      ],
    };

    return creationOrder[planType.toLowerCase()] || [];
  }

  static validateEntityRelationships(entities: any[]): boolean {
    // Validate that referenced entities exist
    const entityMap = new Map();

    // First pass: collect all entity IDs
    entities.forEach((entity) => {
      if (entity.id || entity._id) {
        entityMap.set(entity.id || entity._id, entity);
      }
    });

    // Second pass: validate references
    for (const entity of entities) {
      if (entity.organizationId && !entityMap.has(entity.organizationId)) {
        return false;
      }
      if (entity.complexId && !entityMap.has(entity.complexId)) {
        return false;
      }
      if (entity.clinicId && !entityMap.has(entity.clinicId)) {
        return false;
      }
      if (entity.departmentId && !entityMap.has(entity.departmentId)) {
        return false;
      }
    }

    return true;
  }

  static extractEntityReferences(entityData: any): string[] {
    if (!entityData) {
      return [];
    }

    const references: string[] = [];

    // Common reference fields
    const referenceFields = [
      'organizationId',
      'complexId',
      'clinicId',
      'departmentId',
      'complexDepartmentId',
      'serviceId',
      'subscriptionId',
      'userId',
    ];

    referenceFields.forEach((field) => {
      if (entityData[field]) {
        references.push(entityData[field]);
      }
    });

    return references;
  }
}
