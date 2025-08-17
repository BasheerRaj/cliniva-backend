/**
 * Hierarchical Working Hours Validation Examples
 * 
 * This file demonstrates how clinic working hours can be validated 
 * to ensure they fall within the complex's operating hours.
 */

import { ValidationUtil } from '../../common/utils/validation.util';

// Example 1: Valid clinic hours within complex hours
export function example1_ValidClinicHours() {
  const complexSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00'
    },
    {
      dayOfWeek: 'tuesday',
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

  const clinicSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '10:00',  // Opens 1 hour after complex
      closingTime: '16:30',  // Closes 30 minutes before complex
      breakStartTime: '12:30',
      breakEndTime: '13:30'
    },
    {
      dayOfWeek: 'tuesday',
      isWorkingDay: true,
      openingTime: '09:30',  // Opens 30 minutes after complex
      closingTime: '16:00',  // Closes 1 hour before complex
    }
    // Clinic doesn't work Friday (same as complex)
  ];

  const validation = ValidationUtil.validateHierarchicalWorkingHours(
    complexSchedule,
    clinicSchedule,
    'Health Complex',
    'Cardiology Clinic'
  );

  console.log('Example 1 - Valid Clinic Hours:');
  console.log('Is Valid:', validation.isValid); // Should be true
  console.log('Errors:', validation.errors);   // Should be empty
  
  return validation;
}

// Example 2: Invalid clinic hours - opens before complex
export function example2_InvalidEarlyOpening() {
  const complexSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '17:00'
    }
  ];

  const clinicSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '08:30',  // ❌ Opens before complex!
      closingTime: '16:00'
    }
  ];

  const validation = ValidationUtil.validateHierarchicalWorkingHours(
    complexSchedule,
    clinicSchedule,
    'Health Complex',
    'Pediatrics Clinic'
  );

  console.log('\nExample 2 - Invalid Early Opening:');
  console.log('Is Valid:', validation.isValid); // Should be false
  console.log('Errors:', validation.errors);   // Should contain error about early opening
  
  return validation;
}

// Example 3: Invalid clinic hours - closes after complex
export function example3_InvalidLateClosing() {
  const complexSchedule = [
    {
      dayOfWeek: 'wednesday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '17:00'
    }
  ];

  const clinicSchedule = [
    {
      dayOfWeek: 'wednesday',
      isWorkingDay: true,
      openingTime: '10:00',
      closingTime: '18:00'  // ❌ Closes after complex!
    }
  ];

  const validation = ValidationUtil.validateHierarchicalWorkingHours(
    complexSchedule,
    clinicSchedule,
    'Medical Center',
    'Surgery Clinic'
  );

  console.log('\nExample 3 - Invalid Late Closing:');
  console.log('Is Valid:', validation.isValid); // Should be false
  console.log('Errors:', validation.errors);   // Should contain error about late closing
  
  return validation;
}

// Example 4: Invalid clinic hours - working when complex is closed
export function example4_InvalidWorkingWhenComplexClosed() {
  const complexSchedule = [
    {
      dayOfWeek: 'friday',
      isWorkingDay: false  // Complex is closed on Friday
    }
  ];

  const clinicSchedule = [
    {
      dayOfWeek: 'friday',
      isWorkingDay: true,   // ❌ Clinic trying to work when complex is closed!
      openingTime: '09:00',
      closingTime: '17:00'
    }
  ];

  const validation = ValidationUtil.validateHierarchicalWorkingHours(
    complexSchedule,
    clinicSchedule,
    'Weekend Medical Complex',
    'Emergency Clinic'
  );

  console.log('\nExample 4 - Working When Complex Closed:');
  console.log('Is Valid:', validation.isValid); // Should be false
  console.log('Errors:', validation.errors);   // Should contain error about working when parent is closed
  
  return validation;
}

// Example 5: Real-world scenario with multiple validation errors
export function example5_MultipleValidationErrors() {
  const complexSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '08:00',
      closingTime: '18:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00'
    },
    {
      dayOfWeek: 'saturday',
      isWorkingDay: false
    }
  ];

  const clinicSchedule = [
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '07:30',  // ❌ Opens before complex
      closingTime: '19:00',  // ❌ Closes after complex
      breakStartTime: '11:00',
      breakEndTime: '12:00'
    },
    {
      dayOfWeek: 'saturday',
      isWorkingDay: true,    // ❌ Working when complex is closed
      openingTime: '09:00',
      closingTime: '15:00'
    }
  ];

  const validation = ValidationUtil.validateHierarchicalWorkingHours(
    complexSchedule,
    clinicSchedule,
    'Main Medical Complex',
    'Multi-Specialty Clinic'
  );

  console.log('\nExample 5 - Multiple Validation Errors:');
  console.log('Is Valid:', validation.isValid); // Should be false
  console.log('Errors:', validation.errors);   // Should contain multiple errors
  
  return validation;
}

// Example 6: API Usage Example
export function example6_APIUsageExample() {
  console.log('\nExample 6 - API Usage:');
  console.log(`
// 1. Validate clinic hours against complex hours
POST /working-hours/validate-clinic-hours
{
  "clinicId": "clinic_123",
  "complexId": "complex_456",
  "clinicSchedule": [
    {
      "dayOfWeek": "monday",
      "isWorkingDay": true,
      "openingTime": "10:00",
      "closingTime": "16:30"
    }
  ]
}

// 2. Create clinic working hours with automatic validation against complex
POST /working-hours/with-parent-validation
{
  "workingHours": {
    "entityType": "clinic",
    "entityId": "clinic_123",
    "schedule": [...]
  },
  "parentEntityType": "complex",
  "parentEntityId": "complex_456"
}

// 3. Update clinic hours with parent validation
PUT /working-hours/clinic/clinic_123?validateWithParent=true&parentEntityType=complex&parentEntityId=complex_456
{
  "schedule": [...]
}
  `);
}

// Run all examples
export function runAllExamples() {
  console.log('='.repeat(60));
  console.log('HIERARCHICAL WORKING HOURS VALIDATION EXAMPLES');
  console.log('='.repeat(60));

  example1_ValidClinicHours();
  example2_InvalidEarlyOpening();
  example3_InvalidLateClosing();
  example4_InvalidWorkingWhenComplexClosed();
  example5_MultipleValidationErrors();
  example6_APIUsageExample();

  console.log('\n' + '='.repeat(60));
  console.log('Examples completed. Check the validation results above.');
  console.log('='.repeat(60));
}

// Utility function to format time for display
export function formatScheduleForDisplay(schedule: any[]): string {
  return schedule.map(day => {
    if (!day.isWorkingDay) {
      return `${day.dayOfWeek}: Closed`;
    }
    const times = `${day.openingTime} - ${day.closingTime}`;
    const breaks = day.breakStartTime && day.breakEndTime 
      ? ` (Break: ${day.breakStartTime} - ${day.breakEndTime})`
      : '';
    return `${day.dayOfWeek}: ${times}${breaks}`;
  }).join('\n');
}

// Example of how to use in service
export class ExampleUsageInService {
  async validateClinicWorkingHours(clinicData: any, complexId: string) {
    // Get complex working hours from database
    const complexSchedule = await this.getComplexWorkingHours(complexId);
    
    // Validate clinic schedule against complex
    const validation = ValidationUtil.validateHierarchicalWorkingHours(
      complexSchedule,
      clinicData.workingHours,
      `Complex (${complexId})`,
      `Clinic (${clinicData.id})`
    );

    if (!validation.isValid) {
      throw new Error(`Clinic working hours validation failed: ${validation.errors.join(', ')}`);
    }

    return validation;
  }

  private async getComplexWorkingHours(complexId: string) {
    // This would be implemented to fetch from database
    return [];
  }
}
