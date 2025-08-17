import { ValidationUtil } from '../../../src/common/utils/validation.util';

describe('ValidationUtil', () => {
  describe('validatePlanLimits', () => {
    it('should validate company plan limits correctly', () => {
      const result = ValidationUtil.validatePlanLimits('company', {
        organizations: 1,
        complexes: 5,
        clinics: 25
      });
      
      expect(result).toBe(true);
    });

    it('should validate complex plan limits correctly', () => {
      const result = ValidationUtil.validatePlanLimits('complex', {
        organizations: 0,
        complexes: 1,
        clinics: 10
      });
      
      expect(result).toBe(true);
    });

    it('should validate clinic plan limits correctly', () => {
      const result = ValidationUtil.validatePlanLimits('clinic', {
        organizations: 0,
        complexes: 0,
        clinics: 1
      });
      
      expect(result).toBe(true);
    });

    it('should reject invalid plan type', () => {
      const result = ValidationUtil.validatePlanLimits('invalid', {
        organizations: 1,
        complexes: 1,
        clinics: 1
      });
      
      expect(result).toBe(false);
    });

    it('should reject exceeding limits for company plan', () => {
      const result = ValidationUtil.validatePlanLimits('company', {
        organizations: 2, // Exceeds limit of 1
        complexes: 51,    // Exceeds limit of 50
        clinics: 501      // Exceeds limit of 500
      });
      
      expect(result).toBe(false);
    });
  });

  describe('validateVATNumber', () => {
    it('should validate Saudi Arabia VAT number format', () => {
      expect(ValidationUtil.validateVATNumber('300123456789001', 'SA')).toBe(true);
      expect(ValidationUtil.validateVATNumber('123456789012345', 'SA')).toBe(true);
    });

    it('should reject invalid Saudi Arabia VAT number format', () => {
      expect(ValidationUtil.validateVATNumber('30012345678900', 'SA')).toBe(false); // 14 digits
      expect(ValidationUtil.validateVATNumber('3001234567890011', 'SA')).toBe(false); // 16 digits
      expect(ValidationUtil.validateVATNumber('30012345678900A', 'SA')).toBe(false); // Contains letter
    });

    it('should validate generic VAT number format', () => {
      expect(ValidationUtil.validateVATNumber('GB123456789', 'GB')).toBe(true);
      expect(ValidationUtil.validateVATNumber('ABCD1234', 'OTHER')).toBe(true);
    });

    it('should return true for empty VAT number (optional field)', () => {
      expect(ValidationUtil.validateVATNumber('', 'SA')).toBe(true);
      expect(ValidationUtil.validateVATNumber(undefined as any, 'SA')).toBe(true);
    });
  });

  describe('validateCRNumber', () => {
    it('should validate Saudi Arabia CR number format', () => {
      expect(ValidationUtil.validateCRNumber('1010123456')).toBe(true);
      expect(ValidationUtil.validateCRNumber('2050987654')).toBe(true);
    });

    it('should reject invalid CR number format', () => {
      expect(ValidationUtil.validateCRNumber('101012345')).toBe(false); // 9 digits
      expect(ValidationUtil.validateCRNumber('10101234567')).toBe(false); // 11 digits
      expect(ValidationUtil.validateCRNumber('101012345A')).toBe(false); // Contains letter
    });

    it('should return true for empty CR number (optional field)', () => {
      expect(ValidationUtil.validateCRNumber('')).toBe(true);
      expect(ValidationUtil.validateCRNumber(undefined as any)).toBe(true);
    });
  });

  describe('validateWorkingHours', () => {
    it('should validate correct working hours schedule', () => {
      const schedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00'
        },
        {
          dayOfWeek: 'friday',
          isWorkingDay: false
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate days', () => {
      const schedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        },
        {
          dayOfWeek: 'monday', // Duplicate
          isWorkingDay: false
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate days found: monday');
    });

    it('should validate invalid day names', () => {
      const schedule = [
        {
          dayOfWeek: 'invalidday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00'
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid day: invalidday');
    });

    it('should require opening and closing times for working days', () => {
      const schedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true
          // Missing openingTime and closingTime
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Opening and closing times required for working day: monday');
    });

    it('should validate time format', () => {
      const schedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '25:00', // Invalid hour
          closingTime: '17:60'  // Invalid minute
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid opening time format for monday: 25:00');
      expect(result.errors).toContain('Invalid closing time format for monday: 17:60');
    });

    it('should validate break time format', () => {
      const schedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '25:00', // Invalid
          breakEndTime: '13:60'    // Invalid
        }
      ];

      const result = ValidationUtil.validateWorkingHours(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid break start time format for monday: 25:00');
      expect(result.errors).toContain('Invalid break end time format for monday: 13:60');
    });

    it('should return valid for empty schedule (optional)', () => {
      const result = ValidationUtil.validateWorkingHours([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSocialMediaUrl', () => {
    it('should validate Facebook URLs', () => {
      expect(ValidationUtil.validateSocialMediaUrl('facebook', 'https://facebook.com/testpage')).toBe(true);
      expect(ValidationUtil.validateSocialMediaUrl('facebook', 'https://www.facebook.com/testpage/')).toBe(true);
    });

    it('should validate Instagram URLs', () => {
      expect(ValidationUtil.validateSocialMediaUrl('instagram', 'https://instagram.com/testuser')).toBe(true);
      expect(ValidationUtil.validateSocialMediaUrl('instagram', 'https://www.instagram.com/testuser/')).toBe(true);
    });

    it('should validate WhatsApp URLs', () => {
      expect(ValidationUtil.validateSocialMediaUrl('whatsapp', 'https://wa.me/966501234567')).toBe(true);
      expect(ValidationUtil.validateSocialMediaUrl('whatsapp', 'https://whatsapp.com/966501234567')).toBe(true);
    });

    it('should reject invalid social media URLs', () => {
      expect(ValidationUtil.validateSocialMediaUrl('facebook', 'https://instagram.com/testpage')).toBe(false);
      expect(ValidationUtil.validateSocialMediaUrl('instagram', 'https://facebook.com/testuser')).toBe(false);
      expect(ValidationUtil.validateSocialMediaUrl('whatsapp', 'invalid-url')).toBe(false);
    });

    it('should use generic validation for unknown platforms', () => {
      expect(ValidationUtil.validateSocialMediaUrl('unknown', 'https://example.com')).toBe(true);
      expect(ValidationUtil.validateSocialMediaUrl('unknown', 'invalid-url')).toBe(false);
    });

    it('should return true for empty URLs (optional field)', () => {
      expect(ValidationUtil.validateSocialMediaUrl('facebook', '')).toBe(true);
      expect(ValidationUtil.validateSocialMediaUrl('instagram', undefined as any)).toBe(true);
    });
  });

  describe('validateBusinessProfile', () => {
    it('should validate correct business profile', () => {
      const profile = {
        yearEstablished: 2020,
        mission: 'Provide excellent healthcare',
        vision: 'Leading healthcare provider',
        ceoName: 'Dr. John Doe',
        vatNumber: '300123456789001',
        crNumber: '1010123456'
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate year established range', () => {
      const profile = {
        yearEstablished: 1899 // Too early
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Year established must be between 1900 and ' + new Date().getFullYear());
    });

    it('should validate future year established', () => {
      const profile = {
        yearEstablished: new Date().getFullYear() + 1 // Future year
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Year established must be between 1900 and ' + new Date().getFullYear());
    });

    it('should validate mission statement length', () => {
      const profile = {
        mission: 'A'.repeat(1001) // Too long
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mission statement cannot exceed 1000 characters');
    });

    it('should validate vision statement length', () => {
      const profile = {
        vision: 'A'.repeat(1001) // Too long
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Vision statement cannot exceed 1000 characters');
    });

    it('should validate CEO name length', () => {
      const profile = {
        ceoName: 'A'.repeat(256) // Too long
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CEO name cannot exceed 255 characters');
    });

    it('should validate VAT number format', () => {
      const profile = {
        vatNumber: 'invalid_vat'
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid VAT number format');
    });

    it('should validate CR number format', () => {
      const profile = {
        crNumber: 'invalid_cr'
      };

      const result = ValidationUtil.validateBusinessProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Commercial Registration number format');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(ValidationUtil.validateEmail('test@example.com')).toBe(true);
      expect(ValidationUtil.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(ValidationUtil.validateEmail('simple@domain.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(ValidationUtil.validateEmail('invalid-email')).toBe(false);
      expect(ValidationUtil.validateEmail('test@')).toBe(false);
      expect(ValidationUtil.validateEmail('@domain.com')).toBe(false);
      expect(ValidationUtil.validateEmail('test.domain.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate Saudi Arabia phone number formats', () => {
      expect(ValidationUtil.validatePhone('+966501234567')).toBe(true);
      expect(ValidationUtil.validatePhone('0501234567')).toBe(true);
      expect(ValidationUtil.validatePhone('966501234567')).toBe(false);
      expect(ValidationUtil.validatePhone('+966 50 123 4567')).toBe(true); // With spaces
      expect(ValidationUtil.validatePhone('+966-50-123-4567')).toBe(true); // With dashes
    });

    it('should reject invalid phone number formats', () => {
      expect(ValidationUtil.validatePhone('+966401234567')).toBe(false); // Invalid prefix (4)
      expect(ValidationUtil.validatePhone('+96650123456')).toBe(false);  // Too short
      expect(ValidationUtil.validatePhone('+9665012345678')).toBe(false); // Too long
      expect(ValidationUtil.validatePhone('1234567890')).toBe(false);     // Wrong format
    });
  });

  describe('validateGoogleLocation', () => {
    it('should validate coordinate format', () => {
      expect(ValidationUtil.validateGoogleLocation('24.7136,46.6753')).toBe(true);
      expect(ValidationUtil.validateGoogleLocation('-34.6037,58.3816')).toBe(true);
      expect(ValidationUtil.validateGoogleLocation('0,0')).toBe(true);
    });

    it('should validate Google Place ID format', () => {
      expect(ValidationUtil.validateGoogleLocation('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true);
      expect(ValidationUtil.validateGoogleLocation('ChIJrTLr-GyuEmsRBfy61i59si0')).toBe(true);
    });

    it('should validate address format', () => {
      expect(ValidationUtil.validateGoogleLocation('King Fahd Road, Riyadh, Saudi Arabia')).toBe(true);
      expect(ValidationUtil.validateGoogleLocation('123 Main Street, City, Country')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(ValidationUtil.validateGoogleLocation('invalid')).toBe(false);
      expect(ValidationUtil.validateGoogleLocation('123')).toBe(false);
      expect(ValidationUtil.validateGoogleLocation('')).toBe(true); // Optional field
    });
  });

  describe('validateHierarchicalWorkingHours', () => {
    it('should validate correct hierarchical working hours', () => {
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
          closingTime: '16:00'
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
      expect(result.errors).toContain('Clinic opening time (08:00) on monday must be at or after Complex opening time (09:00)');
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
      expect(result.errors).toContain('Clinic closing time (18:00) on monday must be at or before Complex closing time (17:00)');
    });
  });

  describe('parseTime and formatTimeFromMinutes', () => {
    it('should parse time correctly', () => {
      // Testing private method through public isTimeWithinRange
      expect(ValidationUtil.isTimeWithinRange('10:30', '09:00', '17:00')).toBe(true);
      expect(ValidationUtil.isTimeWithinRange('08:30', '09:00', '17:00')).toBe(false);
      expect(ValidationUtil.isTimeWithinRange('18:30', '09:00', '17:00')).toBe(false);
    });

    it('should format time from minutes correctly', () => {
      expect(ValidationUtil.formatTimeFromMinutes(630)).toBe('10:30'); // 10 hours 30 minutes
      expect(ValidationUtil.formatTimeFromMinutes(60)).toBe('01:00');  // 1 hour
      expect(ValidationUtil.formatTimeFromMinutes(0)).toBe('00:00');   // 0 minutes
      expect(ValidationUtil.formatTimeFromMinutes(1439)).toBe('23:59'); // Max time
    });
  });
});

