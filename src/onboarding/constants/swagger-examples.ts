/**
 * Swagger Examples for Onboarding Module
 *
 * This file contains example request/response objects for Swagger documentation.
 * All examples follow the bilingual message format (Arabic/English).
 */

export const ONBOARDING_SWAGGER_EXAMPLES = {
  // ========== START ONBOARDING ==========
  START_REQUEST: {
    planType: 'company',
  },

  START_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439011',
      subscriptionId: '507f1f77bcf86cd799439012',
      planType: 'company',
      currentStep: 'organization-overview',
      progress: {
        completedSteps: [],
        currentStep: 'organization-overview',
        totalSteps: 12,
        percentComplete: 0,
      },
    },
    message: {
      ar: 'تم بدء عملية التسجيل بنجاح',
      en: 'Onboarding process started successfully',
    },
  },

  // ========== GET PROGRESS ==========
  PROGRESS_SUCCESS: {
    success: true,
    data: {
      userId: '507f1f77bcf86cd799439011',
      subscriptionId: '507f1f77bcf86cd799439012',
      planType: 'company',
      currentStep: 'complex-overview',
      completedSteps: [
        'organization-overview',
        'organization-contact',
        'organization-legal',
      ],
      totalSteps: 12,
      percentComplete: 25,
      canSkipComplex: true,
      entities: {
        organizationId: '507f1f77bcf86cd799439013',
        complexId: null,
        clinicId: null,
      },
    },
    message: {
      ar: 'تم استرجاع تقدم التسجيل بنجاح',
      en: 'Onboarding progress retrieved successfully',
    },
  },

  PROGRESS_NOT_FOUND: {
    success: false,
    error: {
      code: 'ONBOARDING_007',
      message: {
        ar: 'لم يتم العثور على تقدم التسجيل',
        en: 'Onboarding progress not found',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== ORGANIZATION STEP ==========

  // Organization Overview (Step 1 of 3)
  ORGANIZATION_OVERVIEW_REQUEST: {
    name: 'HealthCorp Medical Group',
    legalName: 'HealthCorp Medical Services Company Ltd.',
    registrationNumber: '1010123456',
    logoUrl: 'https://example.com/logo.png',
    website: 'https://healthcorp.sa',
    yearEstablished: 2015,
    mission: 'Providing world-class healthcare services',
    vision: 'To be the leading healthcare provider in the region',
    overview: 'HealthCorp is a comprehensive medical services provider',
    goals: 'Expand to 10 locations by 2030',
    ceoName: 'Dr. Ahmed Al-Rashid',
  },

  ORGANIZATION_OVERVIEW_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439013',
      name: 'HealthCorp Medical Group',
      legalName: 'HealthCorp Medical Services Company Ltd.',
      registrationNumber: '1010123456',
      logoUrl: 'https://example.com/logo.png',
      website: 'https://healthcorp.sa',
      yearEstablished: 2015,
      mission: 'Providing world-class healthcare services',
      vision: 'To be the leading healthcare provider in the region',
      overview: 'HealthCorp is a comprehensive medical services provider',
      goals: 'Expand to 10 locations by 2030',
      ceoName: 'Dr. Ahmed Al-Rashid',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
    entityId: '507f1f77bcf86cd799439013',
    nextStep: 'organization-contact',
    canProceed: true,
    message: {
      ar: 'تم حفظ معلومات الشركة بنجاح',
      en: 'Organization information saved successfully',
    },
  },

  // Organization Contact (Step 2 of 3)
  ORGANIZATION_CONTACT_REQUEST: {
    phoneNumbers: [
      {
        type: 'primary',
        number: '+966112345678',
        countryCode: '+966',
      },
      {
        type: 'secondary',
        number: '+966112345679',
        countryCode: '+966',
      },
    ],
    email: 'info@healthcorp.sa',
    address: {
      street: 'King Fahd Road',
      district: 'Al Olaya',
      city: 'Riyadh',
      postalCode: '12211',
      country: 'Saudi Arabia',
      googleLocation: '24.7136,46.6753',
    },
    emergencyContact: {
      name: 'Emergency Hotline',
      phone: '+966112345680',
      relationship: 'Emergency Services',
    },
    socialMediaLinks: {
      facebook: 'https://facebook.com/healthcorp',
      twitter: 'https://twitter.com/healthcorp',
      instagram: 'https://instagram.com/healthcorp',
      linkedin: 'https://linkedin.com/company/healthcorp',
    },
  },

  ORGANIZATION_CONTACT_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439013',
      phoneNumbers: [
        {
          type: 'primary',
          number: '+966112345678',
          countryCode: '+966',
        },
        {
          type: 'secondary',
          number: '+966112345679',
          countryCode: '+966',
        },
      ],
      email: 'info@healthcorp.sa',
      address: {
        street: 'King Fahd Road',
        district: 'Al Olaya',
        city: 'Riyadh',
        postalCode: '12211',
        country: 'Saudi Arabia',
        googleLocation: '24.7136,46.6753',
      },
      emergencyContact: {
        name: 'Emergency Hotline',
        phone: '+966112345680',
        relationship: 'Emergency Services',
      },
      socialMediaLinks: {
        facebook: 'https://facebook.com/healthcorp',
        twitter: 'https://twitter.com/healthcorp',
        instagram: 'https://instagram.com/healthcorp',
        linkedin: 'https://linkedin.com/company/healthcorp',
      },
      updatedAt: '2026-02-07T10:05:00.000Z',
    },
    nextStep: 'organization-legal',
    canProceed: true,
    message: {
      ar: 'تم حفظ معلومات الاتصال بنجاح',
      en: 'Contact information saved successfully',
    },
  },

  // Organization Legal (Step 3 of 3)
  ORGANIZATION_LEGAL_REQUEST: {
    vatNumber: '300123456789003',
    crNumber: '1010123456',
    termsConditionsUrl: 'https://healthcorp.sa/terms',
    privacyPolicyUrl: 'https://healthcorp.sa/privacy',
  },

  ORGANIZATION_LEGAL_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439013',
      vatNumber: '300123456789003',
      crNumber: '1010123456',
      termsConditionsUrl: 'https://healthcorp.sa/terms',
      privacyPolicyUrl: 'https://healthcorp.sa/privacy',
      updatedAt: '2026-02-07T10:10:00.000Z',
    },
    nextStep: 'complex-overview',
    canProceed: true,
    message: {
      ar: 'تم حفظ المعلومات القانونية بنجاح',
      en: 'Legal information saved successfully',
    },
  },

  // Organization Complete
  ORGANIZATION_COMPLETE_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439013',
      name: 'HealthCorp Medical Group',
      isComplete: true,
      planType: 'company',
    },
    nextStep: 'complex-overview',
    canProceed: true,
    message: {
      ar: 'تم إكمال إعداد الشركة بنجاح',
      en: 'Organization setup completed successfully',
    },
  },

  ORGANIZATION_ALREADY_EXISTS: {
    success: false,
    error: {
      code: 'ONBOARDING_002',
      message: {
        ar: 'الخطة تسمح بإنشاء شركة واحدة فقط',
        en: 'Plan allows maximum 1 organization',
      },
      details: {
        currentCount: 1,
        maxAllowed: 1,
        planType: 'company',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== COMPLEX STEP ==========

  // Complex Overview (Step 1 of 4 for Complex Plan, Step 4 of 12 for Company Plan)
  COMPLEX_OVERVIEW_REQUEST: {
    name: 'HealthCorp Riyadh Medical Complex',
    managerName: 'Dr. Khalid Al-Mansour',
    logoUrl: 'https://example.com/complex-logo.png',
    website: 'https://riyadh-complex.healthcorp.sa',
    yearEstablished: 2018,
    mission: 'Providing comprehensive healthcare services to the community',
    vision: 'To be the leading medical complex in the region',
    overview: 'A state-of-the-art medical complex with multiple specialties',
    goals: 'Serve 10,000 patients annually by 2027',
    ceoName: 'Dr. Khalid Al-Mansour',
    departmentIds: [],
    newDepartmentNames: ['Cardiology', 'Pediatrics', 'Orthopedics'],
    inheritanceSettings: {
      inheritWorkingHours: true,
      inheritContactInfo: false,
      inheritLegalInfo: false,
    },
  },

  COMPLEX_OVERVIEW_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439014',
      name: 'HealthCorp Riyadh Medical Complex',
      managerName: 'Dr. Khalid Al-Mansour',
      logoUrl: 'https://example.com/complex-logo.png',
      website: 'https://riyadh-complex.healthcorp.sa',
      yearEstablished: 2018,
      mission: 'Providing comprehensive healthcare services to the community',
      vision: 'To be the leading medical complex in the region',
      overview: 'A state-of-the-art medical complex with multiple specialties',
      goals: 'Serve 10,000 patients annually by 2027',
      ceoName: 'Dr. Khalid Al-Mansour',
      departments: [
        {
          id: '507f1f77bcf86cd799439020',
          name: 'Cardiology',
        },
        {
          id: '507f1f77bcf86cd799439021',
          name: 'Pediatrics',
        },
        {
          id: '507f1f77bcf86cd799439022',
          name: 'Orthopedics',
        },
      ],
      createdAt: '2026-02-07T10:15:00.000Z',
      updatedAt: '2026-02-07T10:15:00.000Z',
    },
    entityId: '507f1f77bcf86cd799439014',
    nextStep: 'complex-contact',
    canProceed: true,
    message: {
      ar: 'تم حفظ معلومات المجمع بنجاح',
      en: 'Complex information saved successfully',
    },
  },

  COMPLEX_ALREADY_EXISTS: {
    success: false,
    error: {
      code: 'ONBOARDING_003',
      message: {
        ar: 'الخطة تسمح بإنشاء مجمع واحد فقط',
        en: 'Plan allows maximum 1 complex',
      },
      details: {
        currentCount: 1,
        maxAllowed: 1,
        planType: 'complex',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== CLINIC STEP ==========

  // Clinic Overview (Step 1 of 5 for Clinic Plan, Step 5 of 9 for Complex Plan, Step 7 of 12 for Company Plan)
  CLINIC_OVERVIEW_REQUEST: {
    name: 'Advanced Heart Center',
    headDoctorName: 'Dr. Sarah Al-Zahrani',
    specialization: 'Cardiology',
    licenseNumber: 'LC-CARD-2023-001',
    pin: 'AHC-001',
    logoUrl: 'https://example.com/clinic-logo.png',
    website: 'https://heartcenter.healthcorp.sa',
    complexDepartmentId: '507f1f77bcf86cd799439020',
    yearEstablished: 2020,
    mission: 'Providing exceptional cardiac care with compassion',
    vision: 'To be the leading cardiac care center in the region',
    overview:
      'State-of-the-art cardiac care facility with advanced diagnostic equipment',
    goals: 'Serve 5,000 cardiac patients annually by 2027',
    ceoName: 'Dr. Sarah Al-Zahrani',
    services: [
      {
        name: 'Cardiac Consultation',
        description: 'Initial cardiac assessment and consultation',
        durationMinutes: 30,
        price: 300,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
      {
        name: 'ECG Test',
        description: 'Electrocardiogram test',
        durationMinutes: 15,
        price: 150,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
      {
        name: 'Echocardiogram',
        description: 'Ultrasound imaging of the heart',
        durationMinutes: 45,
        price: 500,
        complexDepartmentId: '507f1f77bcf86cd799439020',
      },
    ],
    inheritanceSettings: {
      inheritWorkingHours: true,
      inheritContactInfo: false,
      inheritLegalInfo: false,
    },
  },

  CLINIC_OVERVIEW_SUCCESS: {
    success: true,
    data: {
      id: '507f1f77bcf86cd799439015',
      name: 'Advanced Heart Center',
      headDoctorName: 'Dr. Sarah Al-Zahrani',
      specialization: 'Cardiology',
      licenseNumber: 'LC-CARD-2023-001',
      pin: 'AHC-001',
      logoUrl: 'https://example.com/clinic-logo.png',
      website: 'https://heartcenter.healthcorp.sa',
      complexDepartmentId: '507f1f77bcf86cd799439020',
      yearEstablished: 2020,
      mission: 'Providing exceptional cardiac care with compassion',
      vision: 'To be the leading cardiac care center in the region',
      overview:
        'State-of-the-art cardiac care facility with advanced diagnostic equipment',
      goals: 'Serve 5,000 cardiac patients annually by 2027',
      ceoName: 'Dr. Sarah Al-Zahrani',
      services: [
        {
          id: '507f1f77bcf86cd799439030',
          name: 'Cardiac Consultation',
          description: 'Initial cardiac assessment and consultation',
          durationMinutes: 30,
          price: 300,
        },
        {
          id: '507f1f77bcf86cd799439031',
          name: 'ECG Test',
          description: 'Electrocardiogram test',
          durationMinutes: 15,
          price: 150,
        },
        {
          id: '507f1f77bcf86cd799439032',
          name: 'Echocardiogram',
          description: 'Ultrasound imaging of the heart',
          durationMinutes: 45,
          price: 500,
        },
      ],
      createdAt: '2026-02-07T10:20:00.000Z',
      updatedAt: '2026-02-07T10:20:00.000Z',
    },
    entityId: '507f1f77bcf86cd799439015',
    nextStep: 'clinic-contact',
    canProceed: true,
    message: {
      ar: 'تم حفظ معلومات العيادة بنجاح',
      en: 'Clinic information saved successfully',
    },
  },

  CLINIC_ALREADY_EXISTS: {
    success: false,
    error: {
      code: 'ONBOARDING_004',
      message: {
        ar: 'الخطة تسمح بإنشاء عيادة واحدة فقط',
        en: 'Plan allows maximum 1 clinic',
      },
      details: {
        currentCount: 1,
        maxAllowed: 1,
        planType: 'clinic',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== COMPLETE ONBOARDING ==========
  COMPLETE_SUCCESS: {
    success: true,
    data: {
      organization: {
        id: '507f1f77bcf86cd799439013',
        name: 'HealthCorp Medical Group',
      },
      complex: {
        id: '507f1f77bcf86cd799439014',
        name: 'HealthCorp Riyadh Medical Complex',
      },
      clinic: {
        id: '507f1f77bcf86cd799439015',
        name: 'Advanced Heart Center',
      },
      createdEntities: ['organization', 'complex', 'clinic'],
    },
    message: {
      ar: 'تم إكمال عملية التسجيل بنجاح',
      en: 'Onboarding completed successfully',
    },
  },

  // ========== SKIP COMPLEX ==========
  SKIP_COMPLEX_REQUEST: {
    userId: '507f1f77bcf86cd799439011',
    subscriptionId: '507f1f77bcf86cd799439012',
  },

  SKIP_COMPLEX_SUCCESS: {
    success: true,
    data: {
      currentStep: 'dashboard',
      skippedSteps: [
        'complex-overview',
        'complex-contact',
        'complex-legal',
        'complex-schedule',
        'clinic-overview',
        'clinic-contact',
        'clinic-services',
        'clinic-legal',
        'clinic-schedule',
      ],
      progress: {
        completedSteps: [
          'organization-overview',
          'organization-contact',
          'organization-legal',
        ],
        currentStep: 'dashboard',
        totalSteps: 12,
        percentComplete: 100,
      },
    },
    message: {
      ar: 'تم تخطي المجمع والعيادة بنجاح',
      en: 'Complex and clinic skipped successfully',
    },
  },

  SKIP_COMPLEX_NOT_ALLOWED: {
    success: false,
    error: {
      code: 'ONBOARDING_001',
      message: {
        ar: 'يمكن تخطي المجمع فقط في خطة الشركة',
        en: 'Can only skip complex in company plan',
      },
      details: {
        planType: 'complex',
        allowedPlanTypes: ['company'],
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== WORKING HOURS / SCHEDULE ENDPOINTS ==========

  // Complex Schedule (Working Hours)
  COMPLEX_SCHEDULE_REQUEST: {
    workingHours: [
      {
        dayOfWeek: 'monday',
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'tuesday',
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'wednesday',
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'thursday',
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'friday',
        openingTime: '14:00',
        closingTime: '22:00',
        isActive: true,
        breakStartTime: null,
        breakEndTime: null,
      },
      {
        dayOfWeek: 'saturday',
        openingTime: '08:00',
        closingTime: '20:00',
        isActive: true,
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      },
      {
        dayOfWeek: 'sunday',
        openingTime: null,
        closingTime: null,
        isActive: false,
        breakStartTime: null,
        breakEndTime: null,
      },
    ],
  },

  COMPLEX_SCHEDULE_SUCCESS: {
    success: true,
    data: {
      complexId: '507f1f77bcf86cd799439014',
      workingHours: [
        {
          id: '507f1f77bcf86cd799439040',
          dayOfWeek: 'monday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          id: '507f1f77bcf86cd799439041',
          dayOfWeek: 'tuesday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          id: '507f1f77bcf86cd799439042',
          dayOfWeek: 'wednesday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          id: '507f1f77bcf86cd799439043',
          dayOfWeek: 'thursday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          id: '507f1f77bcf86cd799439044',
          dayOfWeek: 'friday',
          openingTime: '14:00',
          closingTime: '22:00',
          isActive: true,
          breakStartTime: null,
          breakEndTime: null,
        },
        {
          id: '507f1f77bcf86cd799439045',
          dayOfWeek: 'saturday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          id: '507f1f77bcf86cd799439046',
          dayOfWeek: 'sunday',
          openingTime: null,
          closingTime: null,
          isActive: false,
          breakStartTime: null,
          breakEndTime: null,
        },
      ],
      createdAt: '2026-02-07T10:25:00.000Z',
    },
    nextStep: 'clinic-overview',
    canProceed: true,
    message: {
      ar: 'تم حفظ جدول المجمع بنجاح',
      en: 'Complex schedule saved successfully',
    },
  },

  // Clinic Schedule (Working Hours)
  CLINIC_SCHEDULE_REQUEST: {
    workingHours: [
      {
        dayOfWeek: 'monday',
        openingTime: '09:00',
        closingTime: '17:00',
        isActive: true,
        breakStartTime: '12:30',
        breakEndTime: '13:30',
      },
      {
        dayOfWeek: 'tuesday',
        openingTime: '09:00',
        closingTime: '17:00',
        isActive: true,
        breakStartTime: '12:30',
        breakEndTime: '13:30',
      },
      {
        dayOfWeek: 'wednesday',
        openingTime: '09:00',
        closingTime: '17:00',
        isActive: true,
        breakStartTime: '12:30',
        breakEndTime: '13:30',
      },
      {
        dayOfWeek: 'thursday',
        openingTime: '09:00',
        closingTime: '17:00',
        isActive: true,
        breakStartTime: '12:30',
        breakEndTime: '13:30',
      },
      {
        dayOfWeek: 'friday',
        openingTime: '15:00',
        closingTime: '21:00',
        isActive: true,
        breakStartTime: null,
        breakEndTime: null,
      },
      {
        dayOfWeek: 'saturday',
        openingTime: '09:00',
        closingTime: '14:00',
        isActive: true,
        breakStartTime: null,
        breakEndTime: null,
      },
      {
        dayOfWeek: 'sunday',
        openingTime: null,
        closingTime: null,
        isActive: false,
        breakStartTime: null,
        breakEndTime: null,
      },
    ],
    inheritFromParent: false,
  },

  CLINIC_SCHEDULE_SUCCESS: {
    success: true,
    data: {
      clinicId: '507f1f77bcf86cd799439015',
      workingHours: [
        {
          id: '507f1f77bcf86cd799439050',
          dayOfWeek: 'monday',
          openingTime: '09:00',
          closingTime: '17:00',
          isActive: true,
          breakStartTime: '12:30',
          breakEndTime: '13:30',
        },
        {
          id: '507f1f77bcf86cd799439051',
          dayOfWeek: 'tuesday',
          openingTime: '09:00',
          closingTime: '17:00',
          isActive: true,
          breakStartTime: '12:30',
          breakEndTime: '13:30',
        },
        {
          id: '507f1f77bcf86cd799439052',
          dayOfWeek: 'wednesday',
          openingTime: '09:00',
          closingTime: '17:00',
          isActive: true,
          breakStartTime: '12:30',
          breakEndTime: '13:30',
        },
        {
          id: '507f1f77bcf86cd799439053',
          dayOfWeek: 'thursday',
          openingTime: '09:00',
          closingTime: '17:00',
          isActive: true,
          breakStartTime: '12:30',
          breakEndTime: '13:30',
        },
        {
          id: '507f1f77bcf86cd799439054',
          dayOfWeek: 'friday',
          openingTime: '15:00',
          closingTime: '21:00',
          isActive: true,
          breakStartTime: null,
          breakEndTime: null,
        },
        {
          id: '507f1f77bcf86cd799439055',
          dayOfWeek: 'saturday',
          openingTime: '09:00',
          closingTime: '14:00',
          isActive: true,
          breakStartTime: null,
          breakEndTime: null,
        },
        {
          id: '507f1f77bcf86cd799439056',
          dayOfWeek: 'sunday',
          openingTime: null,
          closingTime: null,
          isActive: false,
          breakStartTime: null,
          breakEndTime: null,
        },
      ],
      createdAt: '2026-02-07T10:30:00.000Z',
    },
    nextStep: 'completed',
    canProceed: true,
    message: {
      ar: 'تم حفظ جدول العيادة بنجاح',
      en: 'Clinic schedule saved successfully',
    },
  },

  CLINIC_SCHEDULE_INHERITED: {
    success: true,
    data: {
      clinicId: '507f1f77bcf86cd799439015',
      workingHours: [
        {
          id: '507f1f77bcf86cd799439060',
          dayOfWeek: 'monday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          inheritedFrom: 'complex',
        },
        {
          id: '507f1f77bcf86cd799439061',
          dayOfWeek: 'tuesday',
          openingTime: '08:00',
          closingTime: '20:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          inheritedFrom: 'complex',
        },
      ],
      inheritedFrom: {
        entityType: 'complex',
        entityId: '507f1f77bcf86cd799439014',
        entityName: 'HealthCorp Riyadh Medical Complex',
      },
      createdAt: '2026-02-07T10:30:00.000Z',
    },
    nextStep: 'completed',
    canProceed: true,
    message: {
      ar: 'تم وراثة جدول العيادة من المجمع بنجاح',
      en: 'Clinic schedule inherited from complex successfully',
    },
  },

  // ========== WORKING HOURS INHERITANCE ==========
  INHERITED_WORKING_HOURS_SUCCESS: {
    success: true,
    data: {
      workingHours: [
        {
          day: 'monday',
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          day: 'tuesday',
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
      ],
      source: {
        entityType: 'complex',
        entityId: '507f1f77bcf86cd799439014',
        entityName: 'HealthCorp Riyadh Medical Complex',
      },
      canModify: true,
      message: {
        ar: 'تم وراثة ساعات العمل من المجمع',
        en: 'Working hours inherited from complex',
      },
    },
  },

  INHERITED_WORKING_HOURS_NOT_FOUND: {
    success: false,
    error: {
      code: 'ONBOARDING_012',
      message: {
        ar: 'ساعات العمل غير موجودة',
        en: 'Working hours not found',
      },
      details: {
        entityType: 'complex',
        entityId: '507f1f77bcf86cd799439014',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  // ========== PLAN LIMITS VALIDATION ==========
  PLAN_LIMITS_CAN_CREATE: {
    success: true,
    data: {
      canCreate: true,
      currentCount: 0,
      maxAllowed: 1,
      planType: 'company',
      message: {
        ar: 'يمكن إنشاء شركة جديدة',
        en: 'Can create new organization',
      },
    },
  },

  PLAN_LIMITS_REACHED: {
    success: true,
    data: {
      canCreate: false,
      currentCount: 1,
      maxAllowed: 1,
      planType: 'company',
      message: {
        ar: 'الخطة تسمح بإنشاء شركة واحدة فقط',
        en: 'Plan allows maximum 1 company',
      },
    },
  },

  // ========== STEP VALIDATION ==========
  STEP_VALIDATION_CAN_PROCEED: {
    success: true,
    data: {
      canProceed: true,
      missingSteps: [],
      message: {
        ar: 'يمكن المتابعة إلى هذه الخطوة',
        en: 'Can proceed to this step',
      },
    },
  },

  STEP_VALIDATION_MISSING_PREREQUISITES: {
    success: true,
    data: {
      canProceed: false,
      missingSteps: ['complex-overview', 'complex-contact', 'complex-legal'],
      message: {
        ar: 'يجب إكمال تفاصيل المجمع قبل تعبئة تفاصيل العيادة',
        en: 'Must complete complex details before filling clinic details',
      },
    },
  },

  // ========== COMMON ERRORS ==========
  VALIDATION_ERROR: {
    success: false,
    error: {
      code: 'ONBOARDING_009',
      message: {
        ar: 'خطأ في التحقق من البيانات',
        en: 'Validation error',
      },
      details: {
        field: 'name',
        constraint: 'isNotEmpty',
        value: '',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  UNAUTHORIZED_ERROR: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: {
        ar: 'غير مصرح لك بالوصول',
        en: 'Unauthorized access',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  USER_NOT_FOUND: {
    success: false,
    error: {
      code: 'ONBOARDING_007',
      message: {
        ar: 'المستخدم غير موجود',
        en: 'User not found',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  SUBSCRIPTION_NOT_FOUND: {
    success: false,
    error: {
      code: 'ONBOARDING_008',
      message: {
        ar: 'الاشتراك غير موجود',
        en: 'Subscription not found',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },

  INTERNAL_ERROR: {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: {
        ar: 'حدث خطأ في الخادم',
        en: 'Internal server error',
      },
      timestamp: '2026-02-07T10:30:00.000Z',
    },
  },
};
