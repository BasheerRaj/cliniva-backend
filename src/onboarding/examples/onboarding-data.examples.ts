/**
 * Complete Onboarding Data Examples
 * 
 * This file contains realistic examples of onboarding data for each plan type:
 * - Company Plan: Organization with multiple complexes and clinics
 * - Complex Plan: Medical complex with departments and clinics
 * - Clinic Plan: Single clinic with full business profile
 */

import { CompleteOnboardingDto } from '../dto/complete-onboarding.dto';

// ======================================================================
// COMPANY PLAN EXAMPLE
// ======================================================================
export const COMPANY_PLAN_ONBOARDING_EXAMPLE: CompleteOnboardingDto = {
  // User registration data
  userData: {
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    email: "ahmed.alrashid@healthcorp.sa",
    password: "SecurePassword123!",
    phone: "+966501234567",
    nationality: "Saudi Arabian",
    dateOfBirth: "1985-03-15",
    gender: "male"
  },

  // Subscription details
  subscriptionData: {
    planType: "company",
    planId: "company_premium_plan_001"
  },

  // Organization (parent entity for company plan)
  organization: {
    name: "HealthCorp Medical Group",
    legalName: "HealthCorp Medical Services Company Ltd.",
    registrationNumber: "1010123456",
    phone: "+966112345678",
    email: "info@healthcorp.sa",
    address: "King Fahd Road, Al Olaya District, Riyadh 12211, Saudi Arabia",
    googleLocation: "24.7136,46.6753", // Riyadh coordinates
    logoUrl: "https://healthcorp.sa/assets/logo.png",
    website: "https://www.healthcorp.sa",
    
    // Business profile for company
    businessProfile: {
      yearEstablished: 2010,
      mission: "To provide world-class healthcare services with compassion and excellence, making quality medical care accessible to all communities across Saudi Arabia.",
      vision: "To be the leading healthcare provider in the Middle East, known for innovation, patient care excellence, and medical expertise.",
      ceoName: "Dr. Mohammed Al-Saud"
    },

    // Legal information
    legalInfo: {
      vatNumber: "300123456789001", // 15-digit Saudi VAT
      crNumber: "1010123456",       // 10-digit Commercial Registration
      termsConditions: "Our comprehensive terms and conditions governing the use of HealthCorp medical services...",
      privacyPolicy: "HealthCorp is committed to protecting your privacy and personal health information..."
    }
  },

  // Multiple complexes under the organization
  complexes: [
    {
      name: "HealthCorp Riyadh Medical Complex",
      address: "King Abdulaziz Road, Al Malaz District, Riyadh 11613",
      googleLocation: "24.6408,46.7728",
      phone: "+966112234567",
      email: "riyadh@healthcorp.sa",
      logoUrl: "https://healthcorp.sa/assets/riyadh-complex-logo.png",
      website: "https://riyadh.healthcorp.sa",
      managerName: "Dr. Sarah Al-Zahra",
      departmentIds: ["cardiology", "pediatrics", "orthopedics", "emergency"]
    },
    {
      name: "HealthCorp Jeddah Medical Complex", 
      address: "Prince Abdulmajeed Street, Al Salamah District, Jeddah 23525",
      googleLocation: "21.4858,39.1925",
      phone: "+966123234567",
      email: "jeddah@healthcorp.sa", 
      logoUrl: "https://healthcorp.sa/assets/jeddah-complex-logo.png",
      website: "https://jeddah.healthcorp.sa",
      managerName: "Dr. Khalid Al-Ahmadi",
      departmentIds: ["cardiology", "gynecology", "dermatology", "radiology"]
    }
  ],

  // Medical departments
  departments: [
    {
      name: "Cardiology",
      description: "Comprehensive heart and cardiovascular care services"
    },
    {
      name: "Pediatrics", 
      description: "Specialized medical care for infants, children, and adolescents"
    },
    {
      name: "Orthopedics",
      description: "Bone, joint, and musculoskeletal system treatment"
    },
    {
      name: "Emergency",
      description: "24/7 emergency medical services and trauma care"
    },
    {
      name: "Gynecology",
      description: "Women's health and reproductive medicine"
    },
    {
      name: "Dermatology", 
      description: "Skin, hair, and nail medical treatments"
    },
    {
      name: "Radiology",
      description: "Medical imaging and diagnostic services"
    }
  ],

  // Individual clinics within the complexes
  clinics: [
    {
      name: "Advanced Heart Center",
      complexDepartmentId: "complex_dept_cardiology_riyadh", // Reference to cardiology in Riyadh
      address: "Building A, Floor 3, HealthCorp Riyadh Complex",
      phone: "+966112234501",
      email: "heartcenter@healthcorp.sa",
      licenseNumber: "LC-001-2023",
      headDoctorName: "Dr. Faisal Al-Otaibi",
      specialization: "Interventional Cardiology",
      // Services managed via ClinicService junction table
      
      capacity: {
        maxStaff: 25,
        maxDoctors: 8,
        maxPatients: 150,
        sessionDuration: 45
      }
    },
    {
      name: "Children's Health Clinic",
      complexDepartmentId: "complex_dept_pediatrics_riyadh",
      address: "Building B, Floor 2, HealthCorp Riyadh Complex", 
      phone: "+966112234502",
      email: "pediatrics@healthcorp.sa",
      licenseNumber: "LC-002-2023",
      headDoctorName: "Dr. Amina Al-Mansouri",
      specialization: "General Pediatrics",
      // Services managed via ClinicService junction table
      
      capacity: {
        maxStaff: 15,
        maxDoctors: 5,
        maxPatients: 100,
        sessionDuration: 30
      }
    }
  ],

  // Medical services offered
  services: [
    {
      name: "Echocardiogram",
      description: "Ultrasound examination of the heart",
      durationMinutes: 45,
      price: 500,
      complexDepartmentId: "complex_dept_cardiology_riyadh"
    },
    {
      name: "Cardiac Catheterization", 
      description: "Minimally invasive procedure to diagnose heart conditions",
      durationMinutes: 120,
      price: 3500,
      complexDepartmentId: "complex_dept_cardiology_riyadh"
    },
    {
      name: "Child Health Checkup",
      description: "Comprehensive pediatric examination and assessment",
      durationMinutes: 30,
      price: 200,
      complexDepartmentId: "complex_dept_pediatrics_riyadh"
    }
  ],

  // Working hours for different entities
  workingHours: [
    // Organization working hours (overall company hours)
    {
      dayOfWeek: "sunday",
      isWorkingDay: true,
      openingTime: "08:00",
      closingTime: "22:00"
    },
    {
      dayOfWeek: "monday", 
      isWorkingDay: true,
      openingTime: "08:00",
      closingTime: "22:00"
    },
    {
      dayOfWeek: "friday",
      isWorkingDay: false
    },
    // Riyadh Complex working hours
    {
      dayOfWeek: "sunday",
      isWorkingDay: true, 
      openingTime: "09:00",
      closingTime: "21:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00"
    },
    {
      dayOfWeek: "monday",
      isWorkingDay: true,
      openingTime: "09:00", 
      closingTime: "21:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00"
    }
  ],

  // Contact information and social media
  contacts: [
    // Organization contacts
    {
      contactType: "facebook",
      contactValue: "https://facebook.com/HealthCorpSA"
    },
    {
      contactType: "instagram", 
      contactValue: "https://instagram.com/healthcorp_sa"
    },
    {
      contactType: "twitter",
      contactValue: "https://twitter.com/HealthCorpSA"
    },
    {
      contactType: "linkedin",
      contactValue: "https://linkedin.com/company/healthcorp-sa"
    },
    {
      contactType: "whatsapp",
      contactValue: "https://wa.me/966501234567"
    },
    // Riyadh Complex contacts
    {
      contactType: "facebook",
      contactValue: "https://facebook.com/HealthCorpRiyadh"
    }
  ],

  // Legal documents and policies
  legalInfo: {
    vatNumber: "300123456789001",
    crNumber: "1010123456", 
    termsConditions: "HEALTHCORP TERMS AND CONDITIONS\n\n1. ACCEPTANCE OF TERMS\nBy accessing and using HealthCorp services, you agree to be bound by these Terms...",
    privacyPolicy: "HEALTHCORP PRIVACY POLICY\n\n1. INFORMATION WE COLLECT\nWe collect information to provide better services to our patients..."
  }
};

// ======================================================================
// COMPLEX PLAN EXAMPLE  
// ======================================================================
export const COMPLEX_PLAN_ONBOARDING_EXAMPLE: CompleteOnboardingDto = {
  // User registration data
  userData: {
    firstName: "Dr. Fatima",
    lastName: "Al-Harbi",
    email: "fatima.alharbi@alzahra-medical.com",
    password: "ComplexSecure456!",
    phone: "+966505678901", 
    nationality: "Saudi Arabian",
    dateOfBirth: "1978-08-22",
    gender: "female"
  },

  // Subscription details
  subscriptionData: {
    planType: "complex",
    planId: "complex_standard_plan_002"
  },

  // No organization for complex plan - complex is the top entity
  organization: undefined,

  // Single complex (main entity for complex plan)
  complexes: [
    {
      name: "Al-Zahra Medical Complex",
      address: "Al-Madinah Al-Munawarah Road, Al Aziziyah District, Jeddah 23334",
      googleLocation: "21.5433,39.1728",
      phone: "+966126789012",
      email: "info@alzahra-medical.com",
      logoUrl: "https://alzahra-medical.com/assets/logo.png", 
      website: "https://www.alzahra-medical.com",
      managerName: "Dr. Fatima Al-Harbi",
      departmentIds: ["obstetrics", "gynecology", "pediatrics", "internal_medicine"],

      // Business profile (required for complex plan)
      businessProfile: {
        yearEstablished: 2015,
        mission: "Providing exceptional women's and children's healthcare with a focus on family-centered care and medical excellence.",
        vision: "To be the premier women's and children's medical complex in the Western Region of Saudi Arabia.",
        ceoName: "Dr. Fatima Al-Harbi"
      },

      // Legal information (required for complex plan)
      legalInfo: {
        vatNumber: "300987654321002",
        crNumber: "2050987654",
        termsConditions: "Al-Zahra Medical Complex Terms of Service...",
        privacyPolicy: "Your privacy is important to us. This policy explains how we collect and use your information..."
      }
    }
  ],

  // Specialized departments for women and children's health
  departments: [
    {
      name: "Obstetrics",
      description: "Pregnancy, childbirth, and postpartum care services"
    },
    {
      name: "Gynecology", 
      description: "Women's reproductive health and surgical services"
    },
    {
      name: "Pediatrics",
      description: "Comprehensive healthcare for newborns, infants, and children"
    },
    {
      name: "Internal Medicine",
      description: "Adult internal medicine and family healthcare"
    }
  ],

  // Specialized clinics within the complex
  clinics: [
    {
      name: "Women's Wellness Center",
      complexDepartmentId: "complex_dept_gynecology_alzahra",
      address: "Building 1, Ground Floor, Al-Zahra Medical Complex",
      phone: "+966126789013",
      email: "womens-wellness@alzahra-medical.com",
      licenseNumber: "LC-WW-2023-001",
      headDoctorName: "Dr. Maryam Al-Johani", 
      specialization: "Gynecology and Women's Health",
      // Services managed via ClinicService junction table

      capacity: {
        maxStaff: 12,
        maxDoctors: 4,
        maxPatients: 80,
        sessionDuration: 30
      }
    },
    {
      name: "Maternity and Birth Center",
      complexDepartmentId: "complex_dept_obstetrics_alzahra", 
      address: "Building 2, Floor 1-2, Al-Zahra Medical Complex",
      phone: "+966126789014",
      email: "maternity@alzahra-medical.com",
      licenseNumber: "LC-MB-2023-002",
      headDoctorName: "Dr. Aisha Al-Ghamdi",
      specialization: "Obstetrics and Maternal-Fetal Medicine",
      // Services managed via ClinicService junction table

      capacity: {
        maxStaff: 20,
        maxDoctors: 6, 
        maxPatients: 60,
        sessionDuration: 60
      }
    },
    {
      name: "Children's Care Clinic",
      complexDepartmentId: "complex_dept_pediatrics_alzahra",
      address: "Building 3, All Floors, Al-Zahra Medical Complex", 
      phone: "+966126789015",
      email: "pediatrics@alzahra-medical.com",
      licenseNumber: "LC-CC-2023-003",
      headDoctorName: "Dr. Omar Al-Rashid",
      specialization: "General Pediatrics and Adolescent Medicine",
      // Services managed via ClinicService junction table

      capacity: {
        maxStaff: 18,
        maxDoctors: 6,
        maxPatients: 120,
        sessionDuration: 30
      }
    }
  ],

  // Medical services
  services: [
    {
      name: "Gynecological Examination",
      description: "Comprehensive women's health examination",
      durationMinutes: 30,
      price: 300,
      complexDepartmentId: "complex_dept_gynecology_alzahra"
    },
    {
      name: "Prenatal Care Visit",
      description: "Regular pregnancy monitoring and care",
      durationMinutes: 45,
      price: 250,
      complexDepartmentId: "complex_dept_obstetrics_alzahra"
    },
    {
      name: "Pediatric Consultation", 
      description: "General pediatric examination and consultation",
      durationMinutes: 30,
      price: 200,
      complexDepartmentId: "complex_dept_pediatrics_alzahra"
    }
  ],

  // Hierarchical working hours - Complex and Clinics within complex hours
  workingHours: [
    // Complex working hours (9 AM - 5 PM)
    {
      entityType: "complex",
      entityName: "Al-Zahra Medical Complex",
      dayOfWeek: "sunday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00"
    },
    {
      entityType: "complex",
      entityName: "Al-Zahra Medical Complex",
      dayOfWeek: "monday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00"
    },
    {
      entityType: "complex",
      entityName: "Al-Zahra Medical Complex",
      dayOfWeek: "tuesday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00"
    },
    {
      entityType: "complex",
      entityName: "Al-Zahra Medical Complex",
      dayOfWeek: "friday",
      isWorkingDay: false
    },
    {
      entityType: "complex",
      entityName: "Al-Zahra Medical Complex",
      dayOfWeek: "saturday",
      isWorkingDay: false
    },

    // Clinic 1: Women's Wellness Center (10 AM - 4:30 PM) - Within complex hours ✅
    {
      entityType: "clinic",
      entityName: "Women's Wellness Center",
      dayOfWeek: "sunday",
      isWorkingDay: true,
      openingTime: "10:00", // 1 hour after complex opens
      closingTime: "16:30", // 30 minutes before complex closes
      breakStartTime: "12:30",
      breakEndTime: "13:30"
    },
    {
      entityType: "clinic", 
      entityName: "Women's Wellness Center",
      dayOfWeek: "monday",
      isWorkingDay: true,
      openingTime: "10:00",
      closingTime: "16:30",
      breakStartTime: "12:30",
      breakEndTime: "13:30"
    },
    {
      entityType: "clinic",
      entityName: "Women's Wellness Center", 
      dayOfWeek: "tuesday",
      isWorkingDay: true,
      openingTime: "10:00",
      closingTime: "16:30",
      breakStartTime: "12:30",
      breakEndTime: "13:30"
    },

    // Clinic 2: Maternity Center (10 AM - 1 PM) - Within complex hours ✅
    {
      entityType: "clinic",
      entityName: "Maternity and Birth Center",
      dayOfWeek: "sunday", 
      isWorkingDay: true,
      openingTime: "10:00", // 1 hour after complex opens
      closingTime: "13:00"  // 4 hours before complex closes
    },
    {
      entityType: "clinic",
      entityName: "Maternity and Birth Center",
      dayOfWeek: "monday",
      isWorkingDay: true,
      openingTime: "10:00",
      closingTime: "13:00"
    },
    {
      entityType: "clinic",
      entityName: "Maternity and Birth Center",
      dayOfWeek: "tuesday",
      isWorkingDay: true, 
      openingTime: "10:00",
      closingTime: "13:00"
    }
  ],

  // Social media and contacts
  contacts: [
    {
      contactType: "facebook",
      contactValue: "https://facebook.com/AlZahraMedical"
    },
    {
      contactType: "instagram",
      contactValue: "https://instagram.com/alzahramedical"
    },
    {
      contactType: "whatsapp", 
      contactValue: "https://wa.me/966505678901"
    },
    {
      contactType: "twitter",
      contactValue: "https://twitter.com/AlZahraMedical"
    }
  ],

  // Legal information
  legalInfo: {
    vatNumber: "300987654321002",
    crNumber: "2050987654",
    termsConditions: "AL-ZAHRA MEDICAL COMPLEX - TERMS AND CONDITIONS\n\n1. SERVICES\nWe provide specialized women's and children's healthcare services...",
    privacyPolicy: "AL-ZAHRA MEDICAL COMPLEX - PRIVACY POLICY\n\n1. PATIENT INFORMATION\nWe are committed to protecting the privacy of our patients..."
  }
};

// ======================================================================
// CLINIC PLAN EXAMPLE
// ======================================================================
export const CLINIC_PLAN_ONBOARDING_EXAMPLE: CompleteOnboardingDto = {
  // User registration data
  userData: {
    firstName: "Dr. Ali", 
    lastName: "Al-Mutairi",
    email: "dr.ali@brightsmile-dental.sa",
    password: "ClinicPass789!",
    phone: "+966501122334",
    nationality: "Saudi Arabian", 
    dateOfBirth: "1982-12-10",
    gender: "male"
  },

  // Subscription details
  subscriptionData: {
    planType: "clinic",
    planId: "clinic_premium_plan_003"
  },

  // No organization or complex for clinic plan
  organization: undefined,
  complexes: undefined,
  departments: undefined,

  // Single clinic (main entity for clinic plan)
  clinics: [
    {
      name: "Bright Smile Dental Clinic",
      // No complexDepartmentId for clinic-only plan
      complexDepartmentId: undefined,
      address: "Prince Sultan Street, Al Khobar Al Shamalia, Al Khobar 34428, Saudi Arabia",
      googleLocation: "26.2185,50.1974", // Al Khobar coordinates
      phone: "+966138901234",
      email: "info@brightsmile-dental.sa",
      licenseNumber: "DL-BS-2023-001",
      logoUrl: "https://brightsmile-dental.sa/assets/logo.png",
      website: "https://www.brightsmile-dental.sa", 
      headDoctorName: "Dr. Ali Al-Mutairi",
      specialization: "General and Cosmetic Dentistry",
      pin: "BS2023",
      // Services managed via ClinicService junction table

      // Capacity settings (required for clinic plan)
      capacity: {
        maxStaff: 8,
        maxDoctors: 3, 
        maxPatients: 50,
        sessionDuration: 45
      },

      // Business profile (required for clinic plan)
      businessProfile: {
        yearEstablished: 2020,
        mission: "To provide exceptional dental care with a focus on patient comfort, advanced technology, and beautiful, healthy smiles for the entire family.",
        vision: "To be the leading dental clinic in the Eastern Province, known for excellence in dental care and patient satisfaction.",
        ceoName: "Dr. Ali Al-Mutairi"
      },

      // Legal information (required for clinic plan)
      legalInfo: {
        vatNumber: "300555666777003",
        crNumber: "3070555666",
        termsConditions: "Bright Smile Dental Clinic Terms of Service...",
        privacyPolicy: "We respect your privacy and are committed to protecting your personal information..."
      }
    }
  ],

  // Dental services
  services: [
    {
      name: "Professional Dental Cleaning",
      description: "Comprehensive teeth cleaning and oral hygiene maintenance",
      durationMinutes: 45,
      price: 200,
      complexDepartmentId: undefined // No complex department for clinic plan
    },
    {
      name: "Tooth Filling",
      description: "Composite or amalgam dental restorations",
      durationMinutes: 60, 
      price: 350,
      complexDepartmentId: undefined
    },
    {
      name: "Root Canal Treatment",
      description: "Endodontic therapy to save infected or damaged teeth",
      durationMinutes: 90,
      price: 800,
      complexDepartmentId: undefined
    },
    {
      name: "Teeth Whitening",
      description: "Professional tooth whitening for a brighter smile", 
      durationMinutes: 60,
      price: 500,
      complexDepartmentId: undefined
    },
    {
      name: "Dental Consultation",
      description: "Initial examination and treatment planning",
      durationMinutes: 30,
      price: 150,
      complexDepartmentId: undefined
    }
  ],

  // Working hours (optimized for dental practice)
  workingHours: [
    {
      dayOfWeek: "sunday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:30"
    },
    {
      dayOfWeek: "monday", 
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:30"
    },
    {
      dayOfWeek: "tuesday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "18:00",
      breakStartTime: "13:00", 
      breakEndTime: "14:30"
    },
    {
      dayOfWeek: "wednesday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:30"
    },
    {
      dayOfWeek: "thursday",
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:30"
    },
    {
      dayOfWeek: "friday",
      isWorkingDay: false // Closed on Friday
    },
    {
      dayOfWeek: "saturday",
      isWorkingDay: true,
      openingTime: "10:00", // Later start on weekend
      closingTime: "16:00",  // Early close on weekend
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    }
  ],

  // Social media presence 
  contacts: [
    {
      contactType: "facebook",
      contactValue: "https://facebook.com/BrightSmileDentalSA"
    },
    {
      contactType: "instagram", 
      contactValue: "https://instagram.com/brightsmile_dental_sa"
    },
    {
      contactType: "whatsapp",
      contactValue: "https://wa.me/966501122334"
    },
    {
      contactType: "twitter",
      contactValue: "https://twitter.com/BrightSmileSA"
    },
    {
      contactType: "linkedin",
      contactValue: "https://linkedin.com/company/bright-smile-dental-sa"
    }
  ],

  // Legal documents
  legalInfo: {
    vatNumber: "300555666777003",
    crNumber: "3070555666",
    termsConditions: "BRIGHT SMILE DENTAL CLINIC - TERMS AND CONDITIONS\n\n1. APPOINTMENT POLICY\nAppointments are required for all dental services...",
    privacyPolicy: "BRIGHT SMILE DENTAL CLINIC - PRIVACY POLICY\n\n1. PATIENT RECORDS\nWe maintain strict confidentiality of all patient dental records..."
  }
};

// ======================================================================
// USAGE EXAMPLES AND API CALLS
// ======================================================================

export const API_USAGE_EXAMPLES = {
  // Company Plan API Call
  companyPlanAPICall: `
POST /onboarding/complete
Content-Type: application/json

${JSON.stringify(COMPANY_PLAN_ONBOARDING_EXAMPLE, null, 2)}
`,

  // Complex Plan API Call
  complexPlanAPICall: `
POST /onboarding/complete
Content-Type: application/json

${JSON.stringify(COMPLEX_PLAN_ONBOARDING_EXAMPLE, null, 2)}
`,

  // Clinic Plan API Call 
  clinicPlanAPICall: `
POST /onboarding/complete
Content-Type: application/json

${JSON.stringify(CLINIC_PLAN_ONBOARDING_EXAMPLE, null, 2)}
`,

  // Expected Response Format
  expectedResponse: `
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "success": true,
    "userId": "user_generated_id",
    "subscriptionId": "subscription_generated_id", 
    "entities": {
      "organization": { ... },    // Only for company plan
      "complexes": [ ... ],       // For company and complex plans
      "departments": [ ... ],     // For company and complex plans  
      "clinics": [ ... ],         // For all plans
      "services": [ ... ]         // For all plans
    }
  }
}
`
};

// Utility function to get example by plan type
export function getOnboardingExampleByPlan(planType: string): CompleteOnboardingDto {
  switch (planType.toLowerCase()) {
    case 'company':
      return COMPANY_PLAN_ONBOARDING_EXAMPLE;
    case 'complex':
      return COMPLEX_PLAN_ONBOARDING_EXAMPLE;
    case 'clinic':
      return CLINIC_PLAN_ONBOARDING_EXAMPLE;
    default:
      throw new Error(`Unknown plan type: ${planType}`);
  }
}

// Function to display plan comparison
export function displayPlanComparison() {
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PLAN COMPARISON SUMMARY                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ COMPANY PLAN:                                                                   │
│ ✓ Organization (parent entity)                                                  │
│ ✓ Multiple Complexes                                                            │
│ ✓ Multiple Departments                                                          │
│ ✓ Multiple Clinics                                                              │
│ ✓ Full business hierarchy                                                       │
│ ✓ Corporate branding and legal info                                             │
│                                                                                 │
│ COMPLEX PLAN:                                                                   │
│ ✓ Single Complex (main entity)                                                  │
│ ✓ Multiple Departments                                                          │
│ ✓ Multiple Clinics                                                              │
│ ✓ Business profile required                                                     │
│ ✓ Legal information required                                                    │
│                                                                                 │
│ CLINIC PLAN:                                                                    │
│ ✓ Single Clinic (main entity)                                                   │
│ ✓ Capacity management (staff, doctors, patients)                               │ 
│ ✓ Session duration settings                                                     │
│ ✓ Business profile required                                                     │
│ ✓ Legal information required                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
  `);
}

export default {
  COMPANY_PLAN_ONBOARDING_EXAMPLE,
  COMPLEX_PLAN_ONBOARDING_EXAMPLE, 
  CLINIC_PLAN_ONBOARDING_EXAMPLE,
  API_USAGE_EXAMPLES,
  getOnboardingExampleByPlan,
  displayPlanComparison
};
