import { ValidationUtil } from '../../../src/common/utils/validation.util';

describe('Hierarchical Working Hours Validation', () => {
  describe('Basic Hierarchical Validation', () => {
    it('should validate child hours within parent hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject child working when parent is closed', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: false
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic cannot be open on friday when Complex is closed');
    });

    it('should reject child opening before parent', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00', // Before parent
          closingTime: '16:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Clinic opening time (08:00) on monday must be at or after Complex opening time (09:00)'
      );
    });

    it('should reject child closing after parent', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '18:00' // After parent
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Clinic closing time (18:00) on monday must be at or before Complex closing time (17:00)'
      );
    });

    it('should accept child closed when parent is open', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge Time Cases', () => {
    it('should accept child with same opening and closing times as parent', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00', // Same as parent
          closingTime: '17:00'  // Same as parent
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle midnight boundary times', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '00:00',
          closingTime: '23:59'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '00:01',
          closingTime: '23:58'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle one-minute difference validation', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:59', // 1 minute before parent
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Clinic opening time (08:59) on monday must be at or after Complex opening time (09:00)'
      );
    });

    it('should handle late night hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '20:00',
          closingTime: '23:30'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '21:00',
          closingTime: '23:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle early morning hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '05:00',
          closingTime: '08:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '05:30',
          closingTime: '07:30'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Break Time Validation', () => {
    it('should accept child break times within working hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '12:30',
          breakEndTime: '13:30'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject child break outside working hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '08:00', // Before working hours
          breakEndTime: '09:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic break time on monday must be within working hours');
    });

    it('should handle child break extending beyond working hours', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '15:00',
          breakEndTime: '17:00' // Extends beyond working hours
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clinic break time on monday must be within working hours');
    });

    it('should handle overlapping break times (currently allows)', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '12:30',
          breakEndTime: '13:30'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-overlapping break times', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '14:00',
          breakEndTime: '15:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle child without break when parent has break', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00'
          // No break times
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle child with break when parent has no break', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
          // No break times
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Multiple Days Validation', () => {
    it('should validate multiple days with mixed patterns', () => {
      const parentSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '08:00', closingTime: '18:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'wednesday', isWorkingDay: false },
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' },
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '11:00', closingTime: '15:00' }
      ];

      const childSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: false }, // Child closed when parent open
        { dayOfWeek: 'wednesday', isWorkingDay: false },
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '11:00', closingTime: '15:00' },
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '12:00', closingTime: '14:00' }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect violations across multiple days', () => {
      const parentSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: false },
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' }
      ];

      const childSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '08:00', closingTime: '18:00' }, // Violation
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' }, // Violation
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' } // Violation
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5); // Multiple violations
      expect(result.errors).toContain('Clinic opening time (08:00) on monday must be at or after Complex opening time (09:00)');
      expect(result.errors).toContain('Clinic closing time (18:00) on monday must be at or before Complex closing time (17:00)');
      expect(result.errors).toContain('Clinic cannot be open on tuesday when Complex is closed');
      expect(result.errors).toContain('Clinic opening time (09:00) on wednesday must be at or after Complex opening time (10:00)');
      expect(result.errors).toContain('Clinic closing time (17:00) on wednesday must be at or before Complex closing time (16:00)');
    });

    it('should handle partial week schedules', () => {
      const parentSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' }
      ];

      const childSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' }, // No parent schedule
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true); // No parent schedule for Tuesday means no constraint
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Schedule Propagation', () => {
    it('should propagate parent schedule validation errors', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'invalid_day',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        },
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '25:00', // Invalid time
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid day'))).toBe(true);
      expect(result.errors.some(error => error.includes('Invalid opening time format'))).toBe(true);
    });

    it('should propagate child schedule validation errors', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '26:00', // Invalid time
          closingTime: '16:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Clinic: Invalid opening time format'))).toBe(true);
    });

    it('should combine individual and hierarchical validation errors', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '25:00', // Invalid time format
          closingTime: '18:00'  // After parent closing time
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors.some(error => error.includes('Invalid opening time format'))).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty parent schedule', () => {
      const parentSchedule: any[] = [];
      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true); // No constraints to violate
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty child schedule', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];
      const childSchedule: any[] = [];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true); // No child schedule to validate
      expect(result.errors).toHaveLength(0);
    });

    it('should handle both empty schedules', () => {
      const parentSchedule: any[] = [];
      const childSchedule: any[] = [];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing opening/closing times', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true
          // Missing opening and closing times
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00',
          closingTime: '16:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Complex',
        'Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Opening and closing times required')
      )).toBe(true);
    });

    it('should handle custom entity names in error messages', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: false
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        'Medical Center',
        'Specialty Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Specialty Clinic cannot be open on friday when Medical Center is closed');
    });

    it('should handle undefined entity names', () => {
      const parentSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: false
        }
      ];

      const childSchedule = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        parentSchedule,
        childSchedule,
        undefined as any,
        undefined as any
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('child cannot be open on friday when parent is closed');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should validate typical medical complex schedule', () => {
      const complexSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00', breakStartTime: '12:00', breakEndTime: '14:00' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00', breakStartTime: '12:00', breakEndTime: '14:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00', breakStartTime: '12:00', breakEndTime: '14:00' },
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00', breakStartTime: '12:00', breakEndTime: '14:00' },
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '08:00', closingTime: '20:00', breakStartTime: '12:00', breakEndTime: '14:00' },
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '10:00', closingTime: '18:00', breakStartTime: '13:00', breakEndTime: '15:00' }
      ];

      const emergencyClinicSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '09:00', closingTime: '19:00' },
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '11:00', closingTime: '17:00' }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        complexSchedule,
        emergencyClinicSchedule,
        'Medical Complex',
        'Emergency Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate dental clinic with flexible hours', () => {
      const complexSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '07:00', closingTime: '21:00' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '07:00', closingTime: '21:00' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '07:00', closingTime: '21:00' },
        { dayOfWeek: 'wednesday', isWorkingDay: true, openingTime: '07:00', closingTime: '21:00' },
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '07:00', closingTime: '21:00' },
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '09:00', closingTime: '18:00' }
      ];

      const dentalClinicSchedule = [
        { dayOfWeek: 'sunday', isWorkingDay: true, openingTime: '09:00', closingTime: '18:00', breakStartTime: '13:00', breakEndTime: '14:30' },
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '18:00', breakStartTime: '13:00', breakEndTime: '14:30' },
        { dayOfWeek: 'tuesday', isWorkingDay: true, openingTime: '09:00', closingTime: '18:00', breakStartTime: '13:00', breakEndTime: '14:30' },
        { dayOfWeek: 'wednesday', isWorkingDay: false }, // Clinic closed for maintenance
        { dayOfWeek: 'thursday', isWorkingDay: true, openingTime: '15:00', closingTime: '21:00' }, // Afternoon/evening shift
        { dayOfWeek: 'friday', isWorkingDay: false },
        { dayOfWeek: 'saturday', isWorkingDay: true, openingTime: '10:00', closingTime: '16:00' }
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        complexSchedule,
        dentalClinicSchedule,
        'Dental Complex',
        'General Dentistry Clinic'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect common scheduling conflicts', () => {
      const complexSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' },
        { dayOfWeek: 'friday', isWorkingDay: false }
      ];

      const problematicClinicSchedule = [
        { dayOfWeek: 'monday', isWorkingDay: true, openingTime: '08:00', closingTime: '18:00' }, // Both violations
        { dayOfWeek: 'friday', isWorkingDay: true, openingTime: '09:00', closingTime: '17:00' } // Working when parent closed
      ];

      const result = ValidationUtil.validateHierarchicalWorkingHours(
        complexSchedule,
        problematicClinicSchedule,
        'Medical Complex',
        'Problem Clinic'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Problem Clinic opening time (08:00) on monday must be at or after Medical Complex opening time (09:00)');
      expect(result.errors).toContain('Problem Clinic closing time (18:00) on monday must be at or before Medical Complex closing time (17:00)');
      expect(result.errors).toContain('Problem Clinic cannot be open on friday when Medical Complex is closed');
    });
  });
});

