export interface PlanConfiguration {
  name: string;
  maxOrganizations: number;
  maxComplexes: number;
  maxClinics: number;
  maxDepartments: number;
  maxServices: number;
  features: string[];
}

export interface PlanLimitsValidation {
  isValid: boolean;
  errors: string[];
}

export class PlanConfigUtil {
  private static readonly planConfigurations: Record<string, PlanConfiguration> = {
    company: {
      name: 'Company Plan',
      maxOrganizations: 1,
      maxComplexes: 10,
      maxClinics: 50,
      maxDepartments: 100,
      maxServices: 200,
      features: ['organization_management', 'complex_management', 'clinic_management', 'department_management', 'service_management']
    },
    complex: {
      name: 'Complex Plan',
      maxOrganizations: 0,
      maxComplexes: 5,
      maxClinics: 20,
      maxDepartments: 50,
      maxServices: 100,
      features: ['complex_management', 'clinic_management', 'department_management', 'service_management']
    },
    clinic: {
      name: 'Clinic Plan',
      maxOrganizations: 0,
      maxComplexes: 0,
      maxClinics: 1,
      maxDepartments: 10,
      maxServices: 50,
      features: ['clinic_management', 'department_management', 'service_management']
    }
  };

  static getPlanConfiguration(planType: string): PlanConfiguration | null {
    if (!planType) {
      return null;
    }
    return this.planConfigurations[planType.toLowerCase()] || null;
  }

  static validatePlanLimits(planType: string, entityCounts: {
    organizations: number;
    complexes: number;
    clinics: number;
    departments?: number;
    services?: number;
  }): PlanLimitsValidation {
    const config = this.getPlanConfiguration(planType);
    if (!config) {
      return {
        isValid: false,
        errors: ['Invalid plan type']
      };
    }

    const errors: string[] = [];

    if (entityCounts.organizations > config.maxOrganizations) {
      errors.push(`Maximum ${config.maxOrganizations} organization(s) allowed for ${config.name}`);
    }

    if (entityCounts.complexes > config.maxComplexes) {
      errors.push(`Maximum ${config.maxComplexes} complex(es) allowed for ${config.name}`);
    }

    if (entityCounts.clinics > config.maxClinics) {
      errors.push(`Maximum ${config.maxClinics} clinic(s) allowed for ${config.name}`);
    }

    if (entityCounts.departments && entityCounts.departments > config.maxDepartments) {
      errors.push(`Maximum ${config.maxDepartments} department(s) allowed for ${config.name}`);
    }

    if (entityCounts.services && entityCounts.services > config.maxServices) {
      errors.push(`Maximum ${config.maxServices} service(s) allowed for ${config.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 