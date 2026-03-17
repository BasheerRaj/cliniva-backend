import { Types } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Shared ObjectId fixtures
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_IDS = {
  organization: new Types.ObjectId('507f1f77bcf86cd799430001'),
  clinic: new Types.ObjectId('507f1f77bcf86cd799430002'),
  patient: new Types.ObjectId('507f1f77bcf86cd799430003'),
  service: new Types.ObjectId('507f1f77bcf86cd799430004'),
  service2: new Types.ObjectId('507f1f77bcf86cd799430005'),
  user: new Types.ObjectId('507f1f77bcf86cd799430006'),
  invoice: new Types.ObjectId('507f1f77bcf86cd799430007'),
  invoiceItemId: new Types.ObjectId('507f1f77bcf86cd799430008'),
  invoiceItemId2: new Types.ObjectId('507f1f77bcf86cd799430009'),
  counter: new Types.ObjectId('507f1f77bcf86cd799430010'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Embedded session builders
// ─────────────────────────────────────────────────────────────────────────────
export function buildSession(overrides: Partial<any> = {}): any {
  return {
    invoiceItemId: MOCK_IDS.invoiceItemId,
    sessionId: 'sess-001',
    sessionName: 'Initial Consultation',
    sessionOrder: 1,
    doctorId: undefined,
    unitPrice: 200,
    discountPercent: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 200,
    paidAmount: 0,
    sessionStatus: 'pending',
    ...overrides,
  };
}

export function buildService(overrides: Partial<any> = {}): any {
  return {
    serviceId: MOCK_IDS.service,
    serviceName: 'Consultation',
    serviceCategory: 'General',
    paymentPlan: 'single_payment',
    sessions: [buildSession()],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock invoice document (mongoose-style with save)
// ─────────────────────────────────────────────────────────────────────────────
export function buildInvoice(overrides: Partial<any> = {}): any {
  const base = {
    _id: MOCK_IDS.invoice,
    invoiceNumber: 'DFT-0001',
    draftNumber: undefined,
    invoiceTitle: 'Test Invoice',
    patientId: MOCK_IDS.patient,
    clinicId: MOCK_IDS.clinic,
    organizationId: MOCK_IDS.organization,
    services: [buildService()],
    subtotal: 200,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 200,
    paidAmount: 0,
    invoiceStatus: 'draft',
    paymentStatus: 'not_due',
    issueDate: new Date('2024-01-15'),
    notes: '',
    createdBy: MOCK_IDS.user,
    updatedBy: undefined,
    deletedAt: undefined,
    postedAt: undefined,
    lastPaymentDate: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
  };

  const merged = { ...base, ...overrides };

  // Make populate chain work fluently
  merged.populate = jest.fn().mockResolvedValue(merged);

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock clinic document
// ─────────────────────────────────────────────────────────────────────────────
export function buildClinic(overrides: Partial<any> = {}): any {
  return {
    _id: MOCK_IDS.clinic,
    name: 'Test Clinic',
    organizationId: MOCK_IDS.organization,
    deletedAt: undefined,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock patient document
// ─────────────────────────────────────────────────────────────────────────────
export function buildPatient(overrides: Partial<any> = {}): any {
  return {
    _id: MOCK_IDS.patient,
    firstName: 'Ahmad',
    lastName: 'Al-Rashid',
    patientNumber: 'PAT-0001',
    deletedAt: undefined,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock service schema document
// ─────────────────────────────────────────────────────────────────────────────
export function buildServiceDoc(overrides: Partial<any> = {}): any {
  return {
    _id: MOCK_IDS.service,
    name: 'Consultation',
    description: 'General consultation',
    isActive: true,
    paymentPlan: 'single_payment',
    durationMinutes: 30,
    sessions: [],
    deletedAt: undefined,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock counter model
// ─────────────────────────────────────────────────────────────────────────────
export function buildCounterModel(): any {
  return {
    findOneAndUpdate: jest.fn(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock invoice model (static query methods)
// ─────────────────────────────────────────────────────────────────────────────
export function buildInvoiceModel(): any {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateInvoiceDto fixture
// ─────────────────────────────────────────────────────────────────────────────
export function buildCreateInvoiceDto(overrides: Partial<any> = {}): any {
  return {
    invoiceTitle: 'Test Invoice',
    patientId: MOCK_IDS.patient.toString(),
    clinicId: MOCK_IDS.clinic.toString(),
    issueDate: '2024-01-15',
    notes: '',
    services: [
      {
        serviceId: MOCK_IDS.service.toString(),
        sessions: [
          {
            sessionId: 'sess-001',
            sessionName: 'Initial Consultation',
            sessionOrder: 1,
            unitPrice: 200,
            discountPercent: 0,
            taxRate: 0,
          },
        ],
      },
    ],
    ...overrides,
  };
}
