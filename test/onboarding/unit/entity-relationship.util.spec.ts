import { EntityRelationshipUtil } from '../../../src/common/utils/entity-relationship.util';

describe('EntityRelationshipUtil', () => {
  describe('validateEntityHierarchy', () => {
    describe('Company Plan Hierarchy', () => {
      it('should validate company plan with organization only', () => {
        const entities = {
          organization: { name: 'Test Corp' },
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should validate company plan with organization and complexes with departments', () => {
        const entities = {
          organization: { name: 'Test Corp' },
          complexes: [{ name: 'Complex 1' }],
          departments: [{ name: 'Dept 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should reject company plan without organization', () => {
        const entities = {
          complexes: [{ name: 'Complex 1' }],
          departments: [{ name: 'Dept 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject company plan with complexes but no departments', () => {
        const entities = {
          organization: { name: 'Test Corp' },
          complexes: [{ name: 'Complex 1' }],
          // Missing departments
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject company plan with empty complexes array but no departments', () => {
        const entities = {
          organization: { name: 'Test Corp' },
          complexes: [],
          departments: [],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );
        expect(result).toBe(true); // Empty complexes is valid
      });
    });

    describe('Complex Plan Hierarchy', () => {
      it('should validate complex plan with complexes and departments', () => {
        const entities = {
          complexes: [{ name: 'Complex 1' }],
          departments: [{ name: 'Dept 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should validate complex plan with multiple complexes and departments', () => {
        const entities = {
          complexes: [{ name: 'Complex 1' }, { name: 'Complex 2' }],
          departments: [{ name: 'Dept 1' }, { name: 'Dept 2' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should reject complex plan without complexes', () => {
        const entities = {
          departments: [{ name: 'Dept 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject complex plan with empty complexes array', () => {
        const entities = {
          complexes: [],
          departments: [{ name: 'Dept 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject complex plan without departments', () => {
        const entities = {
          complexes: [{ name: 'Complex 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject complex plan with empty departments array', () => {
        const entities = {
          complexes: [{ name: 'Complex 1' }],
          departments: [],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'complex',
          entities,
        );
        expect(result).toBe(false);
      });
    });

    describe('Clinic Plan Hierarchy', () => {
      it('should validate clinic plan with clinics', () => {
        const entities = {
          clinics: [{ name: 'Clinic 1' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'clinic',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should validate clinic plan with multiple clinics', () => {
        const entities = {
          clinics: [{ name: 'Clinic 1' }, { name: 'Clinic 2' }],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'clinic',
          entities,
        );
        expect(result).toBe(true);
      });

      it('should reject clinic plan without clinics', () => {
        const entities = {};

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'clinic',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should reject clinic plan with empty clinics array', () => {
        const entities = {
          clinics: [],
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'clinic',
          entities,
        );
        expect(result).toBe(false);
      });
    });

    describe('Invalid Plan Types', () => {
      it('should reject invalid plan type', () => {
        const entities = {
          organization: { name: 'Test Corp' },
        };

        const result = EntityRelationshipUtil.validateEntityHierarchy(
          'invalid',
          entities,
        );
        expect(result).toBe(false);
      });

      it('should be case insensitive', () => {
        const entities = {
          organization: { name: 'Test Corp' },
        };

        const result1 = EntityRelationshipUtil.validateEntityHierarchy(
          'COMPANY',
          entities,
        );
        const result2 = EntityRelationshipUtil.validateEntityHierarchy(
          'Company',
          entities,
        );
        const result3 = EntityRelationshipUtil.validateEntityHierarchy(
          'company',
          entities,
        );

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result3).toBe(true);
      });
    });
  });

  describe('getRequiredEntitiesForPlan', () => {
    it('should return required entities for company plan', () => {
      const required =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('company');
      expect(required).toEqual(['organization']);
    });

    it('should return required entities for complex plan', () => {
      const required =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('complex');
      expect(required).toEqual(['complex', 'department']);
    });

    it('should return required entities for clinic plan', () => {
      const required =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('clinic');
      expect(required).toEqual(['clinic']);
    });

    it('should return empty array for invalid plan', () => {
      const required =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('invalid');
      expect(required).toEqual([]);
    });

    it('should be case insensitive', () => {
      const required1 =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('COMPANY');
      const required2 =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('Company');
      const required3 =
        EntityRelationshipUtil.getRequiredEntitiesForPlan('company');

      expect(required1).toEqual(['organization']);
      expect(required2).toEqual(['organization']);
      expect(required3).toEqual(['organization']);
    });
  });

  describe('validateEntityDependencies', () => {
    it('should validate organization dependencies (no dependencies)', () => {
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'organization',
        [],
      );
      expect(result).toBe(true);
    });

    it('should validate complex dependencies', () => {
      const dependencies = [{ type: 'subscription', id: 'sub_123' }];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'complex',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate clinic dependencies', () => {
      const dependencies = [{ type: 'subscription', id: 'sub_123' }];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'clinic',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate complexDepartment dependencies', () => {
      const dependencies = [
        { type: 'complex', id: 'complex_123' },
        { type: 'department', id: 'dept_123' },
      ];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'complexDepartment',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate service dependencies', () => {
      const dependencies = [{ type: 'complexDepartment', id: 'cd_123' }];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'service',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate workingHours dependencies', () => {
      const dependencies = ['entity_123']; // Simple string ID for entity
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'workingHours',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate contact dependencies', () => {
      const dependencies = ['entity_123'];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'contact',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should validate userAccess dependencies', () => {
      const dependencies = [{ type: 'user', id: 'user_123' }, 'entity_123'];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'userAccess',
        dependencies,
      );
      expect(result).toBe(true);
    });

    it('should reject missing required dependencies', () => {
      const dependencies = []; // Missing required complex and department
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'complexDepartment',
        dependencies,
      );
      expect(result).toBe(false);
    });

    it('should reject partial dependencies', () => {
      const dependencies = [{ type: 'complex', id: 'complex_123' }]; // Missing department
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'complexDepartment',
        dependencies,
      );
      expect(result).toBe(false);
    });

    it('should handle unknown entity type', () => {
      const dependencies = [];
      const result = EntityRelationshipUtil.validateEntityDependencies(
        'unknown',
        dependencies,
      );
      expect(result).toBe(true); // No dependencies required for unknown types
    });
  });

  describe('generateEntityStructure', () => {
    it('should generate structure for company plan', () => {
      const inputData = {
        organization: { name: 'Test Corp' },
        complexes: [{ name: 'Complex 1' }],
        departments: [{ name: 'Dept 1' }],
        clinics: [{ name: 'Clinic 1' }],
        services: [{ name: 'Service 1' }],
        workingHours: [{ dayOfWeek: 'monday' }],
        contacts: [{ type: 'email' }],
      };

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'company',
        inputData,
      );

      expect(structure.planType).toBe('company');
      expect(structure.entities.organization).toEqual({ name: 'Test Corp' });
      expect(structure.entities.complexes).toEqual([{ name: 'Complex 1' }]);
      expect(structure.entities.departments).toEqual([{ name: 'Dept 1' }]);
      expect(structure.entities.clinics).toEqual([{ name: 'Clinic 1' }]);
      expect(structure.entities.services).toEqual([{ name: 'Service 1' }]);
      expect(structure.entities.workingHours).toEqual([
        { dayOfWeek: 'monday' },
      ]);
      expect(structure.entities.contacts).toEqual([{ type: 'email' }]);
    });

    it('should generate structure for complex plan', () => {
      const inputData = {
        complexes: [{ name: 'Complex 1' }],
        departments: [{ name: 'Dept 1' }],
        clinics: [{ name: 'Clinic 1' }],
      };

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'complex',
        inputData,
      );

      expect(structure.planType).toBe('complex');
      expect(structure.entities.organization).toBeUndefined();
      expect(structure.entities.complexes).toEqual([{ name: 'Complex 1' }]);
      expect(structure.entities.departments).toEqual([{ name: 'Dept 1' }]);
      expect(structure.entities.clinics).toEqual([{ name: 'Clinic 1' }]);
    });

    it('should generate structure for clinic plan', () => {
      const inputData = {
        clinics: [{ name: 'Clinic 1' }],
        services: [{ name: 'Service 1' }],
      };

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'clinic',
        inputData,
      );

      expect(structure.planType).toBe('clinic');
      expect(structure.entities.organization).toBeUndefined();
      expect(structure.entities.complexes).toEqual([]);
      expect(structure.entities.departments).toEqual([]);
      expect(structure.entities.clinics).toEqual([{ name: 'Clinic 1' }]);
      expect(structure.entities.services).toEqual([{ name: 'Service 1' }]);
    });

    it('should handle missing entities with defaults', () => {
      const inputData = {};

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'company',
        inputData,
      );

      expect(structure.entities.complexes).toEqual([]);
      expect(structure.entities.departments).toEqual([]);
      expect(structure.entities.clinics).toEqual([]);
      expect(structure.entities.services).toEqual([]);
      expect(structure.entities.workingHours).toEqual([]);
      expect(structure.entities.contacts).toEqual([]);
      expect(structure.entities.dynamicInfo).toEqual([]);
    });

    it('should handle single complex in complex plan', () => {
      const inputData = {
        complex: { name: 'Single Complex' },
      };

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'complex',
        inputData,
      );

      expect(structure.entities.complexes).toEqual([
        { name: 'Single Complex' },
      ]);
    });

    it('should handle single clinic in clinic plan', () => {
      const inputData = {
        clinic: { name: 'Single Clinic' },
      };

      const structure = EntityRelationshipUtil.generateEntityStructure(
        'clinic',
        inputData,
      );

      expect(structure.entities.clinics).toEqual([{ name: 'Single Clinic' }]);
    });
  });

  describe('getEntityCreationOrder', () => {
    it('should return correct order for company plan', () => {
      const order = EntityRelationshipUtil.getEntityCreationOrder('company');

      expect(order).toEqual([
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
      ]);
    });

    it('should return correct order for complex plan', () => {
      const order = EntityRelationshipUtil.getEntityCreationOrder('complex');

      expect(order).toEqual([
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
      ]);
    });

    it('should return correct order for clinic plan', () => {
      const order = EntityRelationshipUtil.getEntityCreationOrder('clinic');

      expect(order).toEqual([
        'subscription',
        'clinic',
        'service',
        'clinicService',
        'workingHours',
        'contact',
        'dynamicInfo',
        'userAccess',
      ]);
    });

    it('should return empty array for invalid plan', () => {
      const order = EntityRelationshipUtil.getEntityCreationOrder('invalid');
      expect(order).toEqual([]);
    });

    it('should be case insensitive', () => {
      const order1 = EntityRelationshipUtil.getEntityCreationOrder('COMPANY');
      const order2 = EntityRelationshipUtil.getEntityCreationOrder('Company');
      const order3 = EntityRelationshipUtil.getEntityCreationOrder('company');

      expect(order1).toEqual(order2);
      expect(order2).toEqual(order3);
    });
  });

  describe('validateEntityRelationships', () => {
    it('should validate entities with correct references', () => {
      const entities = [
        { id: 'org_123', name: 'Organization' },
        { id: 'complex_123', organizationId: 'org_123', name: 'Complex' },
        { id: 'clinic_123', complexId: 'complex_123', name: 'Clinic' },
      ];

      const result =
        EntityRelationshipUtil.validateEntityRelationships(entities);
      expect(result).toBe(true);
    });

    it('should validate entities with _id field', () => {
      const entities = [
        { _id: 'org_123', name: 'Organization' },
        { _id: 'complex_123', organizationId: 'org_123', name: 'Complex' },
      ];

      const result =
        EntityRelationshipUtil.validateEntityRelationships(entities);
      expect(result).toBe(true);
    });

    it('should reject entities with invalid organization reference', () => {
      const entities = [
        { id: 'complex_123', organizationId: 'invalid_org', name: 'Complex' },
      ];

      const result =
        EntityRelationshipUtil.validateEntityRelationships(entities);
      expect(result).toBe(false);
    });

    it('should reject entities with invalid complex reference', () => {
      const entities = [
        { id: 'clinic_123', complexId: 'invalid_complex', name: 'Clinic' },
      ];

      const result =
        EntityRelationshipUtil.validateEntityRelationships(entities);
      expect(result).toBe(false);
    });

    it('should handle empty entities array', () => {
      const result = EntityRelationshipUtil.validateEntityRelationships([]);
      expect(result).toBe(true);
    });

    it('should handle entities without references', () => {
      const entities = [
        { id: 'org_123', name: 'Organization' },
        { id: 'standalone_entity', name: 'Standalone' },
      ];

      const result =
        EntityRelationshipUtil.validateEntityRelationships(entities);
      expect(result).toBe(true);
    });
  });

  describe('extractEntityReferences', () => {
    it('should extract all reference fields', () => {
      const entityData = {
        organizationId: 'org_123',
        complexId: 'complex_123',
        clinicId: 'clinic_123',
        departmentId: 'dept_123',
        complexDepartmentId: 'cd_123',
        serviceId: 'service_123',
        subscriptionId: 'sub_123',
        userId: 'user_123',
        name: 'Test Entity', // Non-reference field
      };

      const references =
        EntityRelationshipUtil.extractEntityReferences(entityData);

      expect(references).toEqual([
        'org_123',
        'complex_123',
        'clinic_123',
        'dept_123',
        'cd_123',
        'service_123',
        'sub_123',
        'user_123',
      ]);
    });

    it('should extract only existing reference fields', () => {
      const entityData = {
        organizationId: 'org_123',
        clinicId: 'clinic_123',
        name: 'Test Entity',
      };

      const references =
        EntityRelationshipUtil.extractEntityReferences(entityData);

      expect(references).toEqual(['org_123', 'clinic_123']);
    });

    it('should return empty array for entity without references', () => {
      const entityData = {
        name: 'Test Entity',
        description: 'A test entity',
      };

      const references =
        EntityRelationshipUtil.extractEntityReferences(entityData);
      expect(references).toEqual([]);
    });

    it('should handle null/undefined entity data', () => {
      const references1 = EntityRelationshipUtil.extractEntityReferences(null);
      const references2 =
        EntityRelationshipUtil.extractEntityReferences(undefined);

      expect(references1).toEqual([]);
      expect(references2).toEqual([]);
    });

    it('should handle empty entity data', () => {
      const references = EntityRelationshipUtil.extractEntityReferences({});
      expect(references).toEqual([]);
    });
  });
});
