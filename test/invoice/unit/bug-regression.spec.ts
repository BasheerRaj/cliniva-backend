/**
 * Bug-Fix Regression Tests — M6 + M7
 *
 * Verifies that the three critical bugs documented in the implementation are
 * fixed and do not regress.
 *
 * BUG-001  TransformedAppointment ID access — transformer util must expose `_id`
 *          as a string, not as a raw ObjectId, so downstream code can call `.toString()`.
 *
 * BUG-005  in_progress cancel block — appointment service must reject cancellation
 *          of an in-progress appointment (status check must include 'in_progress').
 *
 * BUG-012  Idempotent transitionToPosted — calling transitionToPosted on an already-
 *          posted invoice must return the invoice unchanged and must NOT call
 *          generatePostedNumber a second time.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import {
  transformAppointment,
  TransformedAppointment,
} from '../../../src/appointment/utils/appointment-transformer.util';
import { InvoiceService } from '../../../src/invoice/invoice.service';
import { InvoiceNumberService } from '../../../src/invoice/invoice-number.service';
import { Invoice } from '../../../src/database/schemas/invoice.schema';
import { Patient } from '../../../src/database/schemas/patient.schema';
import { Service } from '../../../src/database/schemas/service.schema';
import { Clinic } from '../../../src/database/schemas/clinic.schema';
import { Counter } from '../../../src/database/schemas/counter.schema';

import { MOCK_IDS, buildInvoice } from '../mocks/invoice.mocks';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a minimal populated appointment document for BUG-001
// ─────────────────────────────────────────────────────────────────────────────
function buildPopulatedAppointmentDoc(overrides: Partial<any> = {}): any {
  return {
    _id: new Types.ObjectId('507f191e810c19729de860ea'),
    status: 'scheduled',
    appointmentDate: new Date('2024-03-20'),
    appointmentTime: '10:00',
    durationMinutes: 30,
    patientId: {
      _id: new Types.ObjectId('507f191e810c19729de860eb'),
      firstName: 'Ahmad',
      lastName: 'Hassan',
      phone: null,
      email: null,
      profilePicture: null,
    },
    doctorId: {
      _id: new Types.ObjectId('507f191e810c19729de860ec'),
      firstName: 'Dr. Layla',
      lastName: 'Mansour',
      specialty: null,
      phone: null,
      email: null,
    },
    serviceId: {
      _id: new Types.ObjectId('507f191e810c19729de860ed'),
      name: 'Consultation',
      durationMinutes: 30,
      description: null,
      price: null,
    },
    clinicId: {
      _id: new Types.ObjectId('507f191e810c19729de860ee'),
      name: 'Main Clinic',
    },
    invoiceId: null,
    sessionId: null,
    urgency: null,
    notes: null,
    cancellationReason: null,
    completionNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// BUG-001 — TransformedAppointment ID access
// ═════════════════════════════════════════════════════════════════════════════
describe('BUG-001: TransformedAppointment._id is a string (not ObjectId)', () => {
  it('should expose _id as a string on the root object', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result: TransformedAppointment = transformAppointment(doc);

    expect(typeof result._id).toBe('string');
    expect(result._id).toBe('507f191e810c19729de860ea');
  });

  it('should expose patient._id as a string', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result = transformAppointment(doc);

    expect(typeof result.patient._id).toBe('string');
    expect(result.patient._id).toBe('507f191e810c19729de860eb');
  });

  it('should expose doctor._id as a string', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result = transformAppointment(doc);

    expect(typeof result.doctor._id).toBe('string');
    expect(result.doctor._id).toBe('507f191e810c19729de860ec');
  });

  it('should expose service._id as a string', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result = transformAppointment(doc);

    expect(typeof result.service._id).toBe('string');
    expect(result.service._id).toBe('507f191e810c19729de860ed');
  });

  it('should expose clinic._id as a string', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result = transformAppointment(doc);

    expect(typeof result.clinic._id).toBe('string');
    expect(result.clinic._id).toBe('507f191e810c19729de860ee');
  });

  it('should derive publicId as APPT-<last5 of _id uppercase>', () => {
    const doc = buildPopulatedAppointmentDoc();
    const result = transformAppointment(doc);

    // Last 5 chars of '507f191e810c19729de860ea' = '860ea' → uppercase = '860EA'
    expect(result.publicId).toBe('APPT-860EA');
  });

  it('should build the combined datetime string correctly', () => {
    const doc = buildPopulatedAppointmentDoc({
      appointmentDate: new Date('2024-03-20'),
      appointmentTime: '14:30',
    });
    const result = transformAppointment(doc);

    expect(result.datetime).toBe('2024-03-20T14:30:00.000');
  });

  it('should return an empty string for datetime when date or time is missing', () => {
    const doc = buildPopulatedAppointmentDoc({ appointmentTime: null });
    const result = transformAppointment(doc);

    expect(result.datetime).toBe('');
  });

  it('should handle non-populated (raw ObjectId) patientId gracefully', () => {
    const rawId = new Types.ObjectId();
    const doc = buildPopulatedAppointmentDoc({ patientId: rawId });
    const result = transformAppointment(doc);

    expect(result.patient._id).toBe(rawId.toString());
    expect(result.patient.name).toBe('');
  });

  it('should concatenate patient firstName and lastName correctly', () => {
    const doc = buildPopulatedAppointmentDoc({
      patientId: {
        _id: new Types.ObjectId(),
        firstName: 'Ahmad',
        lastName: 'Hassan',
      },
    });
    const result = transformAppointment(doc);

    expect(result.patient.name).toBe('Ahmad Hassan');
  });

  it('should return null for invoiceId when not set', () => {
    const doc = buildPopulatedAppointmentDoc({ invoiceId: null });
    const result = transformAppointment(doc);

    expect(result.invoiceId).toBeNull();
  });

  it('should convert invoiceId ObjectId to string when present', () => {
    const invId = new Types.ObjectId();
    const doc = buildPopulatedAppointmentDoc({ invoiceId: invId });
    const result = transformAppointment(doc);

    expect(result.invoiceId).toBe(invId.toString());
  });

  it('should return null from transformAppointment when passed null', () => {
    const result = transformAppointment(null);
    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG-005 — in_progress cancel block is tested in appointment service tests.
//           Here we verify the business rule description is documented and the
//           status enum covers 'in_progress'.
//
//           The actual service-level cancellation block for 'in_progress'
//           appointments is exercised in:
//             src/appointment/services/appointment-lifecycle.service.spec.ts
//           and integration tests. This regression file verifies that the
//           transformer correctly passes through the 'in_progress' status
//           so it can be evaluated by callers.
// ═════════════════════════════════════════════════════════════════════════════
describe('BUG-005: in_progress status is passed through the transformer (not masked)', () => {
  it('should preserve in_progress status in the transformed output', () => {
    const doc = buildPopulatedAppointmentDoc({ status: 'in_progress' });
    const result = transformAppointment(doc);

    expect(result.status).toBe('in_progress');
  });

  it('should preserve all appointment statuses without mapping them', () => {
    const statuses = [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];

    for (const status of statuses) {
      const doc = buildPopulatedAppointmentDoc({ status });
      const result = transformAppointment(doc);
      expect(result.status).toBe(status);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG-012 — Idempotent transitionToPosted
// Full scenario is covered in invoice.service.spec.ts.
// This dedicated regression block provides a focused, self-contained check.
// ═════════════════════════════════════════════════════════════════════════════
describe('BUG-012: transitionToPosted is idempotent on already-posted invoices', () => {
  let invoiceService: InvoiceService;
  let invoiceModelMock: any;
  let invoiceConstructorMock: jest.Mock;
  let invoiceNumberService: any;

  beforeEach(async () => {
    invoiceModelMock = {
      findById: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    invoiceNumberService = {
      generateDraftNumber: jest.fn(),
      generatePostedNumber: jest.fn(),
    };

    invoiceConstructorMock = jest.fn().mockImplementation((data: any) => ({
      ...buildInvoice(data),
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(buildInvoice(data)),
    }));
    Object.assign(invoiceConstructorMock, invoiceModelMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getModelToken(Invoice.name),
          useValue: invoiceConstructorMock,
        },
        {
          provide: getModelToken(Patient.name),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getModelToken(Service.name),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getModelToken(Clinic.name),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getModelToken(Counter.name),
          useValue: { findOneAndUpdate: jest.fn() },
        },
        {
          provide: InvoiceNumberService,
          useValue: invoiceNumberService,
        },
      ],
    }).compile();

    invoiceService = module.get<InvoiceService>(InvoiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT call generatePostedNumber when invoice is already posted', async () => {
    const alreadyPosted = buildInvoice({
      invoiceStatus: 'posted',
      invoiceNumber: 'INV-0001',
      draftNumber: 'DFT-0001',
      paymentStatus: 'unpaid',
    });
    invoiceModelMock.findById.mockResolvedValue(alreadyPosted);

    await invoiceService.transitionToPosted(MOCK_IDS.invoice.toString());

    expect(invoiceNumberService.generatePostedNumber).not.toHaveBeenCalled();
  });

  it('should NOT overwrite invoiceNumber when invoice is already posted', async () => {
    const alreadyPosted = buildInvoice({
      invoiceStatus: 'posted',
      invoiceNumber: 'INV-0001',
    });
    invoiceModelMock.findById.mockResolvedValue(alreadyPosted);

    await invoiceService.transitionToPosted(MOCK_IDS.invoice.toString());

    expect(alreadyPosted.invoiceNumber).toBe('INV-0001');
  });

  it('should NOT call save when invoice is already posted', async () => {
    const alreadyPosted = buildInvoice({
      invoiceStatus: 'posted',
      invoiceNumber: 'INV-0001',
    });
    invoiceModelMock.findById.mockResolvedValue(alreadyPosted);

    await invoiceService.transitionToPosted(MOCK_IDS.invoice.toString());

    expect(alreadyPosted.save).not.toHaveBeenCalled();
  });

  it('should return an InvoiceResponseDto when invoice is already posted (no error)', async () => {
    const alreadyPosted = buildInvoice({
      invoiceStatus: 'posted',
      invoiceNumber: 'INV-0007',
      draftNumber: 'DFT-0007',
      paidAmount: 0,
      totalAmount: 500,
    });
    invoiceModelMock.findById.mockResolvedValue(alreadyPosted);

    const result = await invoiceService.transitionToPosted(
      MOCK_IDS.invoice.toString(),
    );

    expect(result).toBeDefined();
    expect(result.invoiceNumber).toBe('INV-0007');
  });

  it('should call generatePostedNumber exactly once for a fresh draft transition', async () => {
    const draftInvoice = buildInvoice({
      invoiceStatus: 'draft',
      invoiceNumber: 'DFT-0001',
    });
    invoiceModelMock.findById.mockResolvedValue(draftInvoice);
    invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0001');

    await invoiceService.transitionToPosted(MOCK_IDS.invoice.toString());

    expect(invoiceNumberService.generatePostedNumber).toHaveBeenCalledTimes(1);
  });
});
