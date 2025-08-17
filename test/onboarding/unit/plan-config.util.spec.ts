import { PlanConfigUtil } from '../../../src/common/utils/plan-config.util';

describe('PlanConfigUtil', () => {
  describe('getPlanConfiguration', () => {
    it('should return company plan configuration', () => {
      const config = PlanConfigUtil.getPlanConfiguration('company');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('Company Plan');
      expect(config?.maxOrganizations).toBe(1);
      expect(config?.maxComplexes).toBe(10);
      expect(config?.maxClinics).toBe(50);
      expect(config?.maxDepartments).toBe(100);
      expect(config?.maxServices).toBe(200);
      expect(config?.features).toContain('organization_management');
      expect(config?.features).toContain('complex_management');
      expect(config?.features).toContain('clinic_management');
    });

    it('should return complex plan configuration', () => {
      const config = PlanConfigUtil.getPlanConfiguration('complex');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('Complex Plan');
      expect(config?.maxOrganizations).toBe(0);
      expect(config?.maxComplexes).toBe(5);
      expect(config?.maxClinics).toBe(20);
      expect(config?.maxDepartments).toBe(50);
      expect(config?.maxServices).toBe(100);
      expect(config?.features).toContain('complex_management');
      expect(config?.features).toContain('clinic_management');
      expect(config?.features).not.toContain('organization_management');
    });

    it('should return clinic plan configuration', () => {
      const config = PlanConfigUtil.getPlanConfiguration('clinic');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('Clinic Plan');
      expect(config?.maxOrganizations).toBe(0);
      expect(config?.maxComplexes).toBe(0);
      expect(config?.maxClinics).toBe(1);
      expect(config?.maxDepartments).toBe(10);
      expect(config?.maxServices).toBe(50);
      expect(config?.features).toContain('clinic_management');
      expect(config?.features).not.toContain('organization_management');
      expect(config?.features).not.toContain('complex_management');
    });

    it('should handle case insensitive plan types', () => {
      const config1 = PlanConfigUtil.getPlanConfiguration('COMPANY');
      const config2 = PlanConfigUtil.getPlanConfiguration('Company');
      const config3 = PlanConfigUtil.getPlanConfiguration('company');
      
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
      expect(config1?.name).toBe('Company Plan');
    });

    it('should return null for invalid plan type', () => {
      const config = PlanConfigUtil.getPlanConfiguration('invalid');
      expect(config).toBeNull();
    });

    it('should return null for empty plan type', () => {
      const config = PlanConfigUtil.getPlanConfiguration('');
      expect(config).toBeNull();
    });

    it('should return null for undefined plan type', () => {
      const config = PlanConfigUtil.getPlanConfiguration(undefined as any);
      expect(config).toBeNull();
    });
  });

  describe('validatePlanLimits', () => {
    describe('Company Plan Validation', () => {
      it('should validate within company plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 25,
          departments: 50,
          services: 100
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate at maximum company plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 10,
          clinics: 50,
          departments: 100,
          services: 200
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject exceeding organization limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 2, // Exceeds limit of 1
          complexes: 5,
          clinics: 25
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 1 organization(s) allowed for Company Plan');
      });

      it('should reject exceeding complex limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 11, // Exceeds limit of 10
          clinics: 25
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 10 complex(es) allowed for Company Plan');
      });

      it('should reject exceeding clinic limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 51 // Exceeds limit of 50
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 50 clinic(s) allowed for Company Plan');
      });

      it('should reject exceeding department limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 25,
          departments: 101 // Exceeds limit of 100
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 100 department(s) allowed for Company Plan');
      });

      it('should reject exceeding service limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 25,
          services: 201 // Exceeds limit of 200
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 200 service(s) allowed for Company Plan');
      });

      it('should handle multiple limit violations', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 2, // Exceeds limit
          complexes: 15,    // Exceeds limit
          clinics: 60,      // Exceeds limit
          departments: 150, // Exceeds limit
          services: 250     // Exceeds limit
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(5);
        expect(result.errors).toContain('Maximum 1 organization(s) allowed for Company Plan');
        expect(result.errors).toContain('Maximum 10 complex(es) allowed for Company Plan');
        expect(result.errors).toContain('Maximum 50 clinic(s) allowed for Company Plan');
        expect(result.errors).toContain('Maximum 100 department(s) allowed for Company Plan');
        expect(result.errors).toContain('Maximum 200 service(s) allowed for Company Plan');
      });
    });

    describe('Complex Plan Validation', () => {
      it('should validate within complex plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('complex', {
          organizations: 0,
          complexes: 3,
          clinics: 15,
          departments: 25,
          services: 50
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate at maximum complex plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('complex', {
          organizations: 0,
          complexes: 5,
          clinics: 20,
          departments: 50,
          services: 100
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject organizations in complex plan', () => {
        const result = PlanConfigUtil.validatePlanLimits('complex', {
          organizations: 1, // Not allowed in complex plan
          complexes: 3,
          clinics: 15
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 0 organization(s) allowed for Complex Plan');
      });

      it('should reject exceeding complex limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('complex', {
          organizations: 0,
          complexes: 6, // Exceeds limit of 5
          clinics: 15
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 5 complex(es) allowed for Complex Plan');
      });

      it('should reject exceeding clinic limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('complex', {
          organizations: 0,
          complexes: 3,
          clinics: 21 // Exceeds limit of 20
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 20 clinic(s) allowed for Complex Plan');
      });
    });

    describe('Clinic Plan Validation', () => {
      it('should validate within clinic plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 0,
          clinics: 1,
          departments: 5,
          services: 25
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate at maximum clinic plan limits', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 0,
          clinics: 1,
          departments: 10,
          services: 50
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject organizations in clinic plan', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 1, // Not allowed
          complexes: 0,
          clinics: 1
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 0 organization(s) allowed for Clinic Plan');
      });

      it('should reject complexes in clinic plan', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 1, // Not allowed
          clinics: 1
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 0 complex(es) allowed for Clinic Plan');
      });

      it('should reject multiple clinics in clinic plan', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 0,
          clinics: 2 // Exceeds limit of 1
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 1 clinic(s) allowed for Clinic Plan');
      });

      it('should reject exceeding department limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 0,
          clinics: 1,
          departments: 11 // Exceeds limit of 10
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 10 department(s) allowed for Clinic Plan');
      });

      it('should reject exceeding service limit', () => {
        const result = PlanConfigUtil.validatePlanLimits('clinic', {
          organizations: 0,
          complexes: 0,
          clinics: 1,
          services: 51 // Exceeds limit of 50
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 50 service(s) allowed for Clinic Plan');
      });
    });

    describe('Edge Cases', () => {
      it('should handle invalid plan type', () => {
        const result = PlanConfigUtil.validatePlanLimits('invalid', {
          organizations: 1,
          complexes: 1,
          clinics: 1
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid plan type');
      });

      it('should handle zero counts', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 0,
          complexes: 0,
          clinics: 0,
          departments: 0,
          services: 0
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle missing optional counts', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 25
          // departments and services not provided
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle negative counts (treat as 0)', () => {
        const result = PlanConfigUtil.validatePlanLimits('company', {
          organizations: -1, // Should be treated as valid since it's below limit
          complexes: -5,
          clinics: -25
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should be case insensitive for plan type', () => {
        const result1 = PlanConfigUtil.validatePlanLimits('COMPANY', {
          organizations: 1,
          complexes: 5,
          clinics: 25
        });

        const result2 = PlanConfigUtil.validatePlanLimits('Company', {
          organizations: 1,
          complexes: 5,
          clinics: 25
        });

        const result3 = PlanConfigUtil.validatePlanLimits('company', {
          organizations: 1,
          complexes: 5,
          clinics: 25
        });

        expect(result1.isValid).toBe(true);
        expect(result2.isValid).toBe(true);
        expect(result3.isValid).toBe(true);
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });
  });
});

