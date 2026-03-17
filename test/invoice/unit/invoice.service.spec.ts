import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { InvoiceService } from '../../../src/invoice/invoice.service';
import { InvoiceNumberService } from '../../../src/invoice/invoice-number.service';
import { Invoice } from '../../../src/database/schemas/invoice.schema';
import { Patient } from '../../../src/database/schemas/patient.schema';
import { Service } from '../../../src/database/schemas/service.schema';
import { Clinic } from '../../../src/database/schemas/clinic.schema';
import { Counter } from '../../../src/database/schemas/counter.schema';

import {
  MOCK_IDS,
  buildClinic,
  buildPatient,
  buildServiceDoc,
  buildInvoice,
  buildCreateInvoiceDto,
  buildService,
  buildSession,
} from '../mocks/invoice.mocks';

/**
 * Unit tests for InvoiceService
 *
 * Covers:
 * - createInvoice     — pricing computation, clinic-scoping, draft generation,
 *                       future-date guard, inactive-service guard
 * - transitionToPosted — idempotency (BUG-012), DFT→INV swap, state assertions
 * - transitionPaymentToUnpaid — only transitions partially_paid, ignores others
 * - updateSessionStatus — arrayFilters update logic, 404 on miss
 * - cancelInvoice — payment-guard, session cascade cancellation
 */
describe('InvoiceService', () => {
  let service: InvoiceService;

  // ── Model mocks ──────────────────────────────────────────────────────────
  let invoiceModel: any;
  let patientModel: any;
  let serviceModel: any;
  let clinicModel: any;
  let counterModel: any;
  let invoiceNumberService: any;

  // ── A constructor mock so `new this.invoiceModel({...})` works ───────────
  let invoiceConstructorMock: jest.Mock;

  beforeEach(async () => {
    clinicModel = { findOne: jest.fn() };
    patientModel = { findOne: jest.fn() };
    serviceModel = { findOne: jest.fn() };
    counterModel = { findOneAndUpdate: jest.fn() };

    invoiceModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    invoiceNumberService = {
      generateDraftNumber: jest.fn(),
      generatePostedNumber: jest.fn(),
    };

    // Mock the invoice constructor: `new this.invoiceModel({...})` returns a
    // document-like object with a `save` and chainable `populate`.
    invoiceConstructorMock = jest.fn().mockImplementation((data: any) => {
      const doc = {
        ...buildInvoice(data),
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn(),
      };
      // populate should return the same object enriched with populated paths
      doc.populate.mockResolvedValue({
        ...doc,
        patientId: {
          _id: MOCK_IDS.patient,
          firstName: 'Ahmad',
          lastName: 'Al-Rashid',
          patientNumber: 'PAT-0001',
        },
        clinicId: { _id: MOCK_IDS.clinic, name: 'Test Clinic' },
        createdBy: {
          _id: MOCK_IDS.user,
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@test.com',
        },
      });
      return doc;
    });

    // Attach static model methods to the constructor so NestJS DI treats it
    // as a Mongoose model.
    Object.assign(invoiceConstructorMock, invoiceModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getModelToken(Invoice.name),
          useValue: invoiceConstructorMock,
        },
        { provide: getModelToken(Patient.name), useValue: patientModel },
        { provide: getModelToken(Service.name), useValue: serviceModel },
        { provide: getModelToken(Clinic.name), useValue: clinicModel },
        { provide: getModelToken(Counter.name), useValue: counterModel },
        { provide: InvoiceNumberService, useValue: invoiceNumberService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createInvoice
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createInvoice', () => {
    const ADMIN_ROLE = 'admin';
    const STAFF_ROLE = 'staff';

    beforeEach(() => {
      clinicModel.findOne.mockResolvedValue(buildClinic());
      patientModel.findOne.mockResolvedValue(buildPatient());
      serviceModel.findOne.mockResolvedValue(buildServiceDoc());
      invoiceNumberService.generateDraftNumber.mockResolvedValue('DFT-0001');
    });

    it('should create an invoice with correct pricing (no discount, no tax)', async () => {
      const dto = buildCreateInvoiceDto();

      const result = await service.createInvoice(
        dto,
        MOCK_IDS.user.toString(),
        ADMIN_ROLE,
      );

      expect(result).toBeDefined();
      expect(result.invoiceNumber).toBe('DFT-0001');
    });

    it('should compute discountAmount correctly from discountPercent', async () => {
      const dto = buildCreateInvoiceDto({
        services: [
          {
            serviceId: MOCK_IDS.service.toString(),
            sessions: [
              {
                sessionId: 'sess-001',
                sessionName: 'Session',
                sessionOrder: 1,
                unitPrice: 200,
                discountPercent: 10, // 10% of 200 = 20
                taxRate: 0,
              },
            ],
          },
        ],
      });

      // Verify the constructor was called with computed discount
      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      expect(passedArg.discountAmount).toBeCloseTo(20, 2);
      expect(passedArg.totalAmount).toBeCloseTo(180, 2);
    });

    it('should compute taxAmount after discount (tax on discounted price)', async () => {
      const dto = buildCreateInvoiceDto({
        services: [
          {
            serviceId: MOCK_IDS.service.toString(),
            sessions: [
              {
                sessionId: 'sess-001',
                sessionName: 'Session',
                sessionOrder: 1,
                unitPrice: 200,
                discountPercent: 10, // priceAfterDiscount = 180
                taxRate: 5,          // taxAmount = 180 * 5% = 9
              },
            ],
          },
        ],
      });

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      expect(passedArg.taxAmount).toBeCloseTo(9, 2);
      expect(passedArg.totalAmount).toBeCloseTo(189, 2);
    });

    it('should accumulate totals across multiple sessions', async () => {
      const dto = buildCreateInvoiceDto({
        services: [
          {
            serviceId: MOCK_IDS.service.toString(),
            sessions: [
              { sessionId: 'sess-001', sessionName: 'Session 1', sessionOrder: 1, unitPrice: 100, discountPercent: 0, taxRate: 0 },
              { sessionId: 'sess-002', sessionName: 'Session 2', sessionOrder: 2, unitPrice: 150, discountPercent: 0, taxRate: 0 },
            ],
          },
        ],
      });

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      expect(passedArg.subtotal).toBeCloseTo(250, 2);
      expect(passedArg.totalAmount).toBeCloseTo(250, 2);
    });

    it('should set invoiceStatus to draft and paymentStatus to not_due on creation', async () => {
      const dto = buildCreateInvoiceDto();

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      expect(passedArg.invoiceStatus).toBe('draft');
      expect(passedArg.paymentStatus).toBe('not_due');
    });

    it('should set paidAmount to 0 on creation', async () => {
      const dto = buildCreateInvoiceDto();

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      expect(passedArg.paidAmount).toBe(0);
    });

    it('should call generateDraftNumber with the clinic organizationId', async () => {
      const dto = buildCreateInvoiceDto();

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      expect(invoiceNumberService.generateDraftNumber).toHaveBeenCalledWith(
        MOCK_IDS.organization.toString(),
      );
    });

    it('should set each embedded session paidAmount to 0 and status to pending', async () => {
      const dto = buildCreateInvoiceDto();

      await service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE);

      const passedArg = invoiceConstructorMock.mock.calls[0][0];
      const session = passedArg.services[0].sessions[0];
      expect(session.paidAmount).toBe(0);
      expect(session.sessionStatus).toBe('pending');
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      clinicModel.findOne.mockResolvedValue(null);
      const dto = buildCreateInvoiceDto();

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      patientModel.findOne.mockResolvedValue(null);
      const dto = buildCreateInvoiceDto();

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      serviceModel.findOne.mockResolvedValue(null);
      const dto = buildCreateInvoiceDto();

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when service is not active', async () => {
      serviceModel.findOne.mockResolvedValue(buildServiceDoc({ isActive: false }));
      const dto = buildCreateInvoiceDto();

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when issueDate is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dto = buildCreateInvoiceDto({
        issueDate: futureDate.toISOString().split('T')[0],
      });

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow issueDate of today (not future)', async () => {
      const today = new Date();
      const dto = buildCreateInvoiceDto({
        issueDate: today.toISOString().split('T')[0],
      });

      await expect(
        service.createInvoice(dto, MOCK_IDS.user.toString(), ADMIN_ROLE),
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException for staff accessing a different clinic', async () => {
      const dto = buildCreateInvoiceDto({
        clinicId: MOCK_IDS.clinic.toString(),
      });

      await expect(
        service.createInvoice(
          dto,
          MOCK_IDS.user.toString(),
          STAFF_ROLE,
          'different-clinic-id',   // userClinicId does not match dto.clinicId
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow staff when their clinic matches the dto clinicId', async () => {
      const dto = buildCreateInvoiceDto();

      await expect(
        service.createInvoice(
          dto,
          MOCK_IDS.user.toString(),
          STAFF_ROLE,
          MOCK_IDS.clinic.toString(), // matches dto.clinicId
        ),
      ).resolves.toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // transitionToPosted
  // BUG-012: Idempotent — calling on already-posted invoice must return as-is
  // ═══════════════════════════════════════════════════════════════════════════
  describe('transitionToPosted', () => {
    it('should transition a draft invoice to posted status', async () => {
      const draft = buildInvoice({ invoiceStatus: 'draft' });
      invoiceModel.findById.mockResolvedValue(draft);
      invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0001');

      await service.transitionToPosted(MOCK_IDS.invoice.toString());

      expect(draft.invoiceStatus).toBe('posted');
      expect(draft.paymentStatus).toBe('unpaid');
    });

    it('should preserve the draft number as draftNumber field', async () => {
      const draft = buildInvoice({
        invoiceStatus: 'draft',
        invoiceNumber: 'DFT-0001',
      });
      invoiceModel.findById.mockResolvedValue(draft);
      invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0001');

      await service.transitionToPosted(MOCK_IDS.invoice.toString());

      expect(draft.draftNumber).toBe('DFT-0001');
    });

    it('should assign the generated INV-xxxx as the new invoiceNumber', async () => {
      const draft = buildInvoice({ invoiceStatus: 'draft' });
      invoiceModel.findById.mockResolvedValue(draft);
      invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0007');

      await service.transitionToPosted(MOCK_IDS.invoice.toString());

      expect(draft.invoiceNumber).toBe('INV-0007');
    });

    it('should set postedAt to a Date on transition', async () => {
      const draft = buildInvoice({ invoiceStatus: 'draft' });
      invoiceModel.findById.mockResolvedValue(draft);
      invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0001');

      const before = Date.now();
      await service.transitionToPosted(MOCK_IDS.invoice.toString());
      const after = Date.now();

      expect(draft.postedAt).toBeInstanceOf(Date);
      expect(draft.postedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(draft.postedAt.getTime()).toBeLessThanOrEqual(after);
    });

    // BUG-012: Idempotency — already posted invoices must not be re-numbered
    it('(BUG-012) should return the invoice as-is if already posted (idempotent)', async () => {
      const posted = buildInvoice({
        invoiceStatus: 'posted',
        invoiceNumber: 'INV-0003',
        draftNumber: 'DFT-0003',
      });
      invoiceModel.findById.mockResolvedValue(posted);

      await service.transitionToPosted(MOCK_IDS.invoice.toString());

      // generatePostedNumber must NOT be called on an already-posted invoice
      expect(invoiceNumberService.generatePostedNumber).not.toHaveBeenCalled();
      // Invoice number should remain unchanged
      expect(posted.invoiceNumber).toBe('INV-0003');
    });

    it('should throw BadRequestException when invoice is cancelled', async () => {
      const cancelled = buildInvoice({ invoiceStatus: 'cancelled' });
      invoiceModel.findById.mockResolvedValue(cancelled);

      await expect(
        service.transitionToPosted(MOCK_IDS.invoice.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      invoiceModel.findById.mockResolvedValue(null);

      await expect(
        service.transitionToPosted(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when invoice is soft-deleted', async () => {
      const deleted = buildInvoice({ deletedAt: new Date() });
      invoiceModel.findById.mockResolvedValue(deleted);

      await expect(
        service.transitionToPosted(MOCK_IDS.invoice.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should save the updated invoice after transition', async () => {
      const draft = buildInvoice({ invoiceStatus: 'draft' });
      invoiceModel.findById.mockResolvedValue(draft);
      invoiceNumberService.generatePostedNumber.mockResolvedValue('INV-0001');

      await service.transitionToPosted(MOCK_IDS.invoice.toString());

      expect(draft.save).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // transitionPaymentToUnpaid
  // Only acts on posted invoices with paymentStatus = partially_paid
  // ═══════════════════════════════════════════════════════════════════════════
  describe('transitionPaymentToUnpaid', () => {
    it('should set paymentStatus to unpaid when currently partially_paid', async () => {
      const inv = buildInvoice({
        invoiceStatus: 'posted',
        paymentStatus: 'partially_paid',
      });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.transitionPaymentToUnpaid(MOCK_IDS.invoice.toString());

      expect(inv.paymentStatus).toBe('unpaid');
      expect(inv.save).toHaveBeenCalledTimes(1);
    });

    it('should NOT change paymentStatus when already unpaid (no-op)', async () => {
      const inv = buildInvoice({
        invoiceStatus: 'posted',
        paymentStatus: 'unpaid',
      });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.transitionPaymentToUnpaid(MOCK_IDS.invoice.toString());

      // Status unchanged, save not called (because condition is paymentStatus === 'partially_paid')
      expect(inv.paymentStatus).toBe('unpaid');
      expect(inv.save).not.toHaveBeenCalled();
    });

    it('should NOT change paymentStatus when already paid', async () => {
      const inv = buildInvoice({
        invoiceStatus: 'posted',
        paymentStatus: 'paid',
      });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.transitionPaymentToUnpaid(MOCK_IDS.invoice.toString());

      expect(inv.paymentStatus).toBe('paid');
      expect(inv.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when invoice is not posted', async () => {
      const draft = buildInvoice({ invoiceStatus: 'draft' });
      invoiceModel.findById.mockResolvedValue(draft);

      await expect(
        service.transitionPaymentToUnpaid(MOCK_IDS.invoice.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      invoiceModel.findById.mockResolvedValue(null);

      await expect(
        service.transitionPaymentToUnpaid(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when invoice is soft-deleted', async () => {
      const deleted = buildInvoice({ deletedAt: new Date() });
      invoiceModel.findById.mockResolvedValue(deleted);

      await expect(
        service.transitionPaymentToUnpaid(MOCK_IDS.invoice.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateSessionStatus
  // Uses arrayFilters to target a specific session by invoiceItemId
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateSessionStatus', () => {
    const INVOICE_ID = MOCK_IDS.invoice.toString();
    const ITEM_ID = MOCK_IDS.invoiceItemId.toString();

    it('should call updateOne with the correct arrayFilters and $set payload', async () => {
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await service.updateSessionStatus(INVOICE_ID, ITEM_ID, 'booked');

      expect(invoiceModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expect.any(Types.ObjectId) }),
        {
          $set: {
            'services.$[].sessions.$[item].sessionStatus': 'booked',
          },
        },
        {
          arrayFilters: [
            { 'item.invoiceItemId': expect.any(Types.ObjectId) },
          ],
        },
      );
    });

    it('should throw NotFoundException when the invoice is not found (matchedCount = 0)', async () => {
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      await expect(
        service.updateSessionStatus(INVOICE_ID, ITEM_ID, 'completed'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should support all valid sessionStatus transitions', async () => {
      const statuses: Array<'pending' | 'booked' | 'in_progress' | 'completed' | 'cancelled'> = [
        'pending',
        'booked',
        'in_progress',
        'completed',
        'cancelled',
      ];

      for (const status of statuses) {
        invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
        await expect(
          service.updateSessionStatus(INVOICE_ID, ITEM_ID, status),
        ).resolves.toBeUndefined();
      }
    });

    it('should include soft-delete guard in the query filter', async () => {
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await service.updateSessionStatus(INVOICE_ID, ITEM_ID, 'in_progress');

      const queryFilter = invoiceModel.updateOne.mock.calls[0][0];
      expect(queryFilter.deletedAt).toEqual({ $exists: false });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // cancelInvoice
  // Rule BZR-0e1f2a3b: Cannot cancel if payments exist (paidAmount > 0)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cancelInvoice', () => {
    it('should cancel a draft invoice with zero paidAmount', async () => {
      const inv = buildInvoice({ invoiceStatus: 'draft', paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.cancelInvoice(
        MOCK_IDS.invoice.toString(),
        MOCK_IDS.user.toString(),
      );

      expect(inv.invoiceStatus).toBe('cancelled');
    });

    it('should cancel a posted invoice with zero paidAmount', async () => {
      const inv = buildInvoice({ invoiceStatus: 'posted', paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.cancelInvoice(
        MOCK_IDS.invoice.toString(),
        MOCK_IDS.user.toString(),
      );

      expect(inv.invoiceStatus).toBe('cancelled');
    });

    it('should set all embedded session statuses to cancelled', async () => {
      const sess1 = buildSession({ sessionStatus: 'booked' });
      const sess2 = buildSession({
        invoiceItemId: MOCK_IDS.invoiceItemId2,
        sessionStatus: 'pending',
      });
      const svc = buildService({ sessions: [sess1, sess2] });
      const inv = buildInvoice({ services: [svc], paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.cancelInvoice(
        MOCK_IDS.invoice.toString(),
        MOCK_IDS.user.toString(),
      );

      expect(inv.services[0].sessions[0].sessionStatus).toBe('cancelled');
      expect(inv.services[0].sessions[1].sessionStatus).toBe('cancelled');
    });

    it('should set updatedBy to the userId on cancellation', async () => {
      const inv = buildInvoice({ paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.cancelInvoice(
        MOCK_IDS.invoice.toString(),
        MOCK_IDS.user.toString(),
      );

      expect(inv.updatedBy.toString()).toBe(MOCK_IDS.user.toString());
    });

    it('should save the invoice after cancellation', async () => {
      const inv = buildInvoice({ paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(inv);

      await service.cancelInvoice(
        MOCK_IDS.invoice.toString(),
        MOCK_IDS.user.toString(),
      );

      expect(inv.save).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when paidAmount > 0 (has payments)', async () => {
      const inv = buildInvoice({ invoiceStatus: 'posted', paidAmount: 50 });
      invoiceModel.findById.mockResolvedValue(inv);

      await expect(
        service.cancelInvoice(
          MOCK_IDS.invoice.toString(),
          MOCK_IDS.user.toString(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include INVOICE_HAS_PAYMENTS code in the exception when payment blocks', async () => {
      const inv = buildInvoice({ invoiceStatus: 'posted', paidAmount: 100 });
      invoiceModel.findById.mockResolvedValue(inv);

      await expect(
        service.cancelInvoice(
          MOCK_IDS.invoice.toString(),
          MOCK_IDS.user.toString(),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVOICE_HAS_PAYMENTS',
        }),
      });
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      invoiceModel.findById.mockResolvedValue(null);

      await expect(
        service.cancelInvoice(
          new Types.ObjectId().toString(),
          MOCK_IDS.user.toString(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when invoice is soft-deleted', async () => {
      const deleted = buildInvoice({ deletedAt: new Date() });
      invoiceModel.findById.mockResolvedValue(deleted);

      await expect(
        service.cancelInvoice(
          MOCK_IDS.invoice.toString(),
          MOCK_IDS.user.toString(),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
