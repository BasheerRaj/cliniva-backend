import { mockServiceResponses } from '../fixtures/onboarding-data.fixture';

export const mockSubscriptionService = {
  createSubscription: jest.fn().mockResolvedValue(mockServiceResponses.subscription),
  getAllSubscriptionPlans: jest.fn().mockResolvedValue([
    {
      id: "company_premium_plan_001",
      name: "Company Premium Plan",
      type: "company",
      price: 2000,
      features: ["unlimited_complexes", "unlimited_clinics"]
    },
    {
      id: "complex_standard_plan_002",
      name: "Complex Standard Plan", 
      type: "complex",
      price: 800,
      features: ["5_complexes", "20_clinics"]
    },
    {
      id: "clinic_premium_plan_003",
      name: "Clinic Premium Plan",
      type: "clinic", 
      price: 300,
      features: ["1_clinic", "advanced_features"]
    }
  ])
};

export const mockOrganizationService = {
  createOrganization: jest.fn().mockResolvedValue(mockServiceResponses.organization)
};

export const mockComplexService = {
  createComplex: jest.fn().mockResolvedValue(mockServiceResponses.complex)
};

export const mockClinicService = {
  createClinic: jest.fn().mockResolvedValue(mockServiceResponses.clinic)
};

export const mockDepartmentService = {
  createComplexDepartment: jest.fn().mockResolvedValue({
    id: "complex_dept_123",
    complexId: "complex_123456789",
    departmentId: "dept_123"
  })
};

export const mockServiceService = {
  createService: jest.fn().mockResolvedValue({
    id: "service_123",
    name: "Test Service",
    duration: 30
  })
};

export const mockWorkingHoursService = {
  createWorkingHours: jest.fn().mockResolvedValue({
    id: "wh_123",
    entityType: "organization",
    entityId: "org_123456789",
    schedule: []
  })
};

export const mockContactService = {
  createBulkContacts: jest.fn().mockResolvedValue([
    {
      id: "contact_123",
      entityType: "organization",
      entityId: "org_123456789",
      contactType: "facebook",
      contactValue: "https://facebook.com/test"
    }
  ])
};

export const mockDynamicInfoService = {
  createLegalDocuments: jest.fn().mockResolvedValue([
    {
      id: "legal_123",
      entityType: "organization",
      entityId: "org_123456789",
      infoType: "terms_conditions",
      infoValue: "Terms and conditions..."
    }
  ])
};

export const mockUserAccessService = {
  createUserAccess: jest.fn().mockResolvedValue({
    id: "access_123",
    userId: "user_123",
    entityType: "organization",
    entityId: "org_123456789",
    permissions: ["read", "write", "admin"]
  })
};

export const mockConnection = {
  startSession: jest.fn().mockReturnValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
  })
};

// Helper function to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset mock implementations to their defaults
  mockSubscriptionService.createSubscription.mockResolvedValue(mockServiceResponses.subscription);
  mockOrganizationService.createOrganization.mockResolvedValue(mockServiceResponses.organization);
  mockComplexService.createComplex.mockResolvedValue(mockServiceResponses.complex);
  mockClinicService.createClinic.mockResolvedValue(mockServiceResponses.clinic);
  
  // Reset other services
  mockDepartmentService.createComplexDepartment.mockResolvedValue({
    id: "complex_dept_123",
    complexId: "complex_123456789", 
    departmentId: "dept_123"
  });
  
  mockWorkingHoursService.createWorkingHours.mockResolvedValue({
    id: "wh_123",
    entityType: "organization",
    entityId: "org_123456789",
    schedule: []
  });
  
  mockContactService.createBulkContacts.mockResolvedValue([]);
  mockDynamicInfoService.createLegalDocuments.mockResolvedValue([]);
  mockUserAccessService.createUserAccess.mockResolvedValue({
    id: "access_123",
    userId: "user_123",
    entityType: "organization", 
    entityId: "org_123456789",
    permissions: ["read", "write"]
  });
};

// Helper function to make specific services fail
export const makeServiceFail = (serviceName: string, error: Error) => {
  switch (serviceName) {
    case 'subscription':
      mockSubscriptionService.createSubscription.mockRejectedValue(error);
      break;
    case 'organization':
      mockOrganizationService.createOrganization.mockRejectedValue(error);
      break;
    case 'complex':
      mockComplexService.createComplex.mockRejectedValue(error);
      break;
    case 'clinic':
      mockClinicService.createClinic.mockRejectedValue(error);
      break;
    case 'department':
      mockDepartmentService.createComplexDepartment.mockRejectedValue(error);
      break;
    case 'workingHours':
      mockWorkingHoursService.createWorkingHours.mockRejectedValue(error);
      break;
    case 'contact':
      mockContactService.createBulkContacts.mockRejectedValue(error);
      break;
    case 'dynamicInfo':
      mockDynamicInfoService.createLegalDocuments.mockRejectedValue(error);
      break;
    case 'userAccess':
      mockUserAccessService.createUserAccess.mockRejectedValue(error);
      break;
  }
};

