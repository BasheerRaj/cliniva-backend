import { CompleteOnboardingDto } from '../../../src/onboarding/dto/complete-onboarding.dto';

export const validCompanyPlanData: CompleteOnboardingDto = {
  userData: {
    firstName: 'Ahmed',
    lastName: 'Al-Rashid',
    email: 'ahmed@healthcorp.sa',
    password: 'SecurePass123!',
    phone: '+966501234567',
    nationality: 'Saudi Arabian',
    dateOfBirth: '1985-03-15',
    gender: 'male',
  },
  subscriptionData: {
    planType: 'company',
    planId: 'company_premium_plan_001',
  },
  organization: {
    name: 'HealthCorp Medical Group',
    legalName: 'HealthCorp Medical Services Company Ltd.',
    phone: '+966112345678',
    email: 'info@healthcorp.sa',
    address: 'King Fahd Road, Riyadh, Saudi Arabia',
    googleLocation: '24.7136,46.6753',
    logoUrl: 'https://healthcorp.sa/logo.png',
    website: 'https://www.healthcorp.sa',
    businessProfile: {
      yearEstablished: 2010,
      mission: 'Provide world-class healthcare services',
      vision: 'Leading healthcare provider in Middle East',
      ceoName: 'Dr. Mohammed Al-Saud',
    },
    legalInfo: {
      vatNumber: '300123456789001',
      crNumber: '1010123456',
    },
  },
  complexes: [
    {
      name: 'HealthCorp Riyadh Complex',
      address: 'King Abdulaziz Road, Riyadh',
      phone: '+966112234567',
      email: 'riyadh@healthcorp.sa',
      managerName: 'Dr. Sarah Al-Zahra',
      departmentIds: ['cardiology', 'pediatrics', 'emergency'],
    },
  ],
  departments: [
    {
      name: 'Cardiology',
      description: 'Heart and cardiovascular care',
    },
    {
      name: 'Pediatrics',
      description: "Children's medical care",
    },
  ],
  clinics: [
    {
      name: 'Advanced Heart Center',
      complexDepartmentId: 'complex_dept_cardiology_riyadh',
      phone: '+966112234501',
      email: 'heart@healthcorp.sa',
      headDoctorName: 'Dr. Faisal Al-Otaibi',
      specialization: 'Cardiology',
      capacity: {
        maxStaff: 25,
        maxDoctors: 8,
        maxPatients: 150,
        sessionDuration: 45,
      },
    },
  ],
  workingHours: [
    {
      entityType: 'organization',
      entityName: 'HealthCorp Medical Group',
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
    },
    {
      entityType: 'complex',
      entityName: 'HealthCorp Riyadh Complex',
      dayOfWeek: 'tuesday',
      isWorkingDay: true,
      openingTime: '09:30',
      closingTime: '16:30',
      breakStartTime: '12:30',
      breakEndTime: '13:30',
    },
  ],
  contacts: [
    {
      contactType: 'facebook',
      contactValue: 'https://facebook.com/HealthCorpSA',
    },
    {
      contactType: 'whatsapp',
      contactValue: 'https://wa.me/966501234567',
    },
  ],
};

export const validComplexPlanData: CompleteOnboardingDto = {
  userData: {
    firstName: 'Dr. Fatima',
    lastName: 'Al-Harbi',
    email: 'fatima@alzahra-medical.com',
    password: 'ComplexPass456!',
    phone: '+966505678901',
    nationality: 'Saudi Arabian',
    dateOfBirth: '1978-08-22',
    gender: 'female',
  },
  subscriptionData: {
    planType: 'complex',
    planId: 'complex_standard_plan_002',
  },
  complexes: [
    {
      name: 'Al-Zahra Medical Complex',
      address: 'Al-Madinah Road, Jeddah, Saudi Arabia',
      phone: '+966126789012',
      email: 'info@alzahra-medical.com',
      logoUrl: 'https://alzahra-medical.com/logo.png',
      website: 'https://alzahra-medical.com',
      managerName: 'Dr. Fatima Al-Harbi',
      departmentIds: ['obstetrics', 'gynecology', 'pediatrics'],
      businessProfile: {
        yearEstablished: 2015,
        mission: "Exceptional women's and children's healthcare",
        vision: "Premier women's medical complex in Western Region",
        ceoName: 'Dr. Fatima Al-Harbi',
      },
      legalInfo: {
        vatNumber: '300987654321002',
        crNumber: '2050987654',
      },
    },
  ],
  departments: [
    {
      name: 'Obstetrics',
      description: 'Pregnancy and childbirth care',
    },
    {
      name: 'Gynecology',
      description: "Women's reproductive health",
    },
  ],
  clinics: [
    {
      name: "Women's Wellness Center",
      complexDepartmentId: 'complex_dept_gynecology_alzahra',
      phone: '+966126789013',
      email: 'wellness@alzahra-medical.com',
      headDoctorName: 'Dr. Maryam Al-Johani',
      specialization: "Women's Health",
      capacity: {
        maxStaff: 12,
        maxDoctors: 4,
        maxPatients: 80,
        sessionDuration: 30,
      },
    },
  ],
  workingHours: [
    {
      entityType: 'complex',
      entityName: 'Al-Zahra Medical Complex',
      dayOfWeek: 'sunday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
    },
    {
      entityType: 'clinic',
      entityName: "Women's Wellness Center",
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '10:00',
      closingTime: '16:30',
      breakStartTime: '12:30',
      breakEndTime: '13:30',
    },
  ],
};

export const validClinicPlanData: CompleteOnboardingDto = {
  userData: {
    firstName: 'Dr. Ali',
    lastName: 'Al-Mutairi',
    email: 'dr.ali@brightsmile-dental.sa',
    password: 'ClinicPass789!',
    phone: '+966501122334',
    nationality: 'Saudi Arabian',
    dateOfBirth: '1982-12-10',
    gender: 'male',
  },
  subscriptionData: {
    planType: 'clinic',
    planId: 'clinic_premium_plan_003',
  },
  clinics: [
    {
      name: 'Bright Smile Dental Clinic',
      address: 'Prince Sultan Street, Al Khobar, Saudi Arabia',
      googleLocation: '26.2185,50.1974',
      phone: '+966138901234',
      email: 'info@brightsmile-dental.sa',
      licenseNumber: 'DL-BS-2023-001',
      logoUrl: 'https://brightsmile-dental.sa/logo.png',
      website: 'https://brightsmile-dental.sa',
      headDoctorName: 'Dr. Ali Al-Mutairi',
      specialization: 'General and Cosmetic Dentistry',
      pin: 'BS2023',
      capacity: {
        maxStaff: 8,
        maxDoctors: 3,
        maxPatients: 50,
        sessionDuration: 45,
      },
      businessProfile: {
        yearEstablished: 2020,
        mission: 'Exceptional dental care with patient comfort',
        vision: 'Leading dental clinic in Eastern Province',
        ceoName: 'Dr. Ali Al-Mutairi',
      },
      legalInfo: {
        vatNumber: '300555666777003',
        crNumber: '3070555666',
      },
    },
  ],
  services: [
    {
      name: 'Dental Cleaning',
      description: 'Professional teeth cleaning',
      durationMinutes: 45,
      price: 200,
    },
    {
      name: 'Tooth Filling',
      description: 'Dental restorations',
      durationMinutes: 60,
      price: 350,
    },
  ],
  workingHours: [
    {
      dayOfWeek: 'sunday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '18:00',
      breakStartTime: '13:00',
      breakEndTime: '14:30',
    },
    {
      dayOfWeek: 'monday',
      isWorkingDay: true,
      openingTime: '09:00',
      closingTime: '18:00',
      breakStartTime: '13:00',
      breakEndTime: '14:30',
    },
    {
      dayOfWeek: 'friday',
      isWorkingDay: false,
    },
  ],
  contacts: [
    {
      contactType: 'facebook',
      contactValue: 'https://facebook.com/BrightSmileDentalSA',
    },
    {
      contactType: 'whatsapp',
      contactValue: 'https://wa.me/966501122334',
    },
  ],
};

// Invalid data for testing error scenarios
export const invalidOnboardingData = {
  missingUserData: {
    ...validCompanyPlanData,
    userData: undefined,
  },

  invalidPlanType: {
    ...validCompanyPlanData,
    subscriptionData: {
      planType: 'invalid',
      planId: 'test_plan',
    },
  },

  companyPlanWithoutOrganization: {
    ...validCompanyPlanData,
    organization: undefined,
  },

  complexPlanWithoutComplexes: {
    ...validComplexPlanData,
    complexes: undefined,
  },

  clinicPlanWithoutClinics: {
    ...validClinicPlanData,
    clinics: undefined,
  },

  invalidWorkingHours: {
    ...validCompanyPlanData,
    workingHours: [
      {
        dayOfWeek: 'invalidDay',
        isWorkingDay: true,
        openingTime: '25:00', // Invalid time
        closingTime: '26:00', // Invalid time
      },
    ],
  },

  conflictingWorkingHours: {
    ...validComplexPlanData,
    workingHours: [
      {
        entityType: 'complex',
        entityName: 'Al-Zahra Medical Complex',
        dayOfWeek: 'sunday',
        isWorkingDay: false, // Complex is closed
      },
      {
        entityType: 'clinic',
        entityName: "Women's Wellness Center",
        dayOfWeek: 'sunday',
        isWorkingDay: true, // But clinic is open - conflict!
        openingTime: '10:00',
        closingTime: '16:00',
      },
    ],
  },

  invalidVATNumber: {
    ...validCompanyPlanData,
    organization: {
      ...validCompanyPlanData.organization,
      legalInfo: {
        vatNumber: 'invalid_vat', // Invalid format
        crNumber: '1010123456',
      },
    },
  },

  clinicPlanWithoutCapacity: {
    ...validClinicPlanData,
    clinics: [
      {
        name: 'Test Clinic',
        // Missing capacity - should fail validation
      },
    ],
  },

  exceedsPlanLimits: {
    ...validClinicPlanData,
    clinics: [
      { name: 'Clinic 1' },
      { name: 'Clinic 2' }, // Clinic plan allows only 1 clinic
    ],
  },
};

// Mock responses for services
export const mockServiceResponses = {
  subscription: {
    id: 'sub_123456789',
    planType: 'company',
    planId: 'company_premium_plan_001',
    userId: 'user_123',
    status: 'active',
  },

  organization: {
    id: 'org_123456789',
    name: 'HealthCorp Medical Group',
    subscriptionId: 'sub_123456789',
  },

  complex: {
    id: 'complex_123456789',
    name: 'HealthCorp Riyadh Complex',
    organizationId: 'org_123456789',
    subscriptionId: 'sub_123456789',
  },

  clinic: {
    id: 'clinic_123456789',
    name: 'Advanced Heart Center',
    complexDepartmentId: 'complex_dept_cardiology_riyadh',
    subscriptionId: 'sub_123456789',
  },
};
