import { Types } from 'mongoose';
import { MOCK_IDS } from '../../invoice/mocks/invoice.mocks';

// Re-export shared IDs so payment tests don't need to import from invoice mocks
export { MOCK_IDS };

// ─────────────────────────────────────────────────────────────────────────────
// Payment-specific ObjectIds
// ─────────────────────────────────────────────────────────────────────────────
export const PAYMENT_IDS = {
  payment: new Types.ObjectId('607f1f77bcf86cd799430001'),
  payment2: new Types.ObjectId('607f1f77bcf86cd799430002'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock invoice document (posted, with balance)
// ─────────────────────────────────────────────────────────────────────────────
export function buildPostedInvoice(overrides: Partial<any> = {}): any {
  const base = {
    _id: MOCK_IDS.invoice,
    invoiceNumber: 'INV-0001',
    draftNumber: 'DFT-0001',
    invoiceTitle: 'Test Invoice',
    patientId: MOCK_IDS.patient,
    clinicId: MOCK_IDS.clinic,
    organizationId: MOCK_IDS.organization,
    services: [],
    subtotal: 500,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 500,
    paidAmount: 0,
    invoiceStatus: 'posted',
    paymentStatus: 'unpaid',
    issueDate: new Date('2024-01-15'),
    postedAt: new Date('2024-01-15'),
    deletedAt: undefined,
    lastPaymentDate: undefined,
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { ...base, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock payment document
// ─────────────────────────────────────────────────────────────────────────────
export function buildPayment(overrides: Partial<any> = {}): any {
  const base = {
    _id: PAYMENT_IDS.payment,
    paymentId: 'PAY-0001',
    invoiceId: MOCK_IDS.invoice,
    patientId: MOCK_IDS.patient,
    clinicId: MOCK_IDS.clinic,
    amount: 200,
    paymentMethod: 'cash',
    paymentDate: new Date('2024-01-15'),
    notes: '',
    addedBy: MOCK_IDS.user,
    updatedBy: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { ...base, ...overrides };
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
// CreatePaymentDto fixture
// ─────────────────────────────────────────────────────────────────────────────
export function buildCreatePaymentDto(overrides: Partial<any> = {}): any {
  return {
    invoiceId: MOCK_IDS.invoice.toString(),
    patientId: MOCK_IDS.patient.toString(),
    amount: 200,
    paymentMethod: 'cash',
    paymentDate: '2024-01-15',
    notes: '',
    sessionAllocations: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock MongoDB session (transaction context)
// ─────────────────────────────────────────────────────────────────────────────
export function buildMongoSession(): any {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock mongoose Connection
// ─────────────────────────────────────────────────────────────────────────────
export function buildConnection(session: any): any {
  return {
    startSession: jest.fn().mockResolvedValue(session),
  };
}
