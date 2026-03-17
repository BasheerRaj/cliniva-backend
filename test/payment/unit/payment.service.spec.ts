import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken, InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { PaymentService } from '../../../src/payment/payment.service';
import { PaymentBalanceService } from '../../../src/payment/payment-balance.service';
import { Payment } from '../../../src/database/schemas/payment.schema';
import { Invoice } from '../../../src/database/schemas/invoice.schema';
import { Patient } from '../../../src/database/schemas/patient.schema';
import { Clinic } from '../../../src/database/schemas/clinic.schema';

import {
  MOCK_IDS,
  PAYMENT_IDS,
  buildPostedInvoice,
  buildPayment,
  buildPatient,
  buildCreatePaymentDto,
  buildMongoSession,
  buildConnection,
} from '../mocks/payment.mocks';

/**
 * Unit tests for PaymentService
 *
 * Covers:
 * - createPayment — invoice validation, amount guards, future-date guard,
 *                   patient-mismatch guard, sessionAllocations sum validation,
 *                   session paidAmount update via arrayFilters, balance delegation
 * - Allocation total must equal payment amount (ALLOCATION_SUM_MISMATCH)
 * - Transaction: commit on success, abort on error
 */
describe('PaymentService', () => {
  let service: PaymentService;

  // ── Model / service mocks ────────────────────────────────────────────────
  let paymentModel: any;
  let invoiceModel: any;
  let patientModel: any;
  let clinicModel: any;
  let paymentBalanceService: any;
  let connectionMock: any;
  let sessionMock: any;

  // Mock constructor for `new this.paymentModel({...})`
  let paymentConstructorMock: jest.Mock;

  beforeEach(async () => {
    sessionMock = buildMongoSession();
    connectionMock = buildConnection(sessionMock);

    invoiceModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    patientModel = {
      findById: jest.fn(),
    };

    clinicModel = {
      findById: jest.fn(),
    };

    paymentBalanceService = {
      updateInvoiceBalances: jest.fn().mockResolvedValue(undefined),
      recalculateInvoiceBalances: jest.fn().mockResolvedValue(undefined),
    };

    // Populated payment returned by findById(...).populate(...)
    const populatedPayment = {
      ...buildPayment(),
      _id: { toString: () => PAYMENT_IDS.payment.toString() },
      patientId: {
        _id: MOCK_IDS.patient,
        firstName: 'Ahmad',
        lastName: 'Al-Rashid',
        patientNumber: 'PAT-0001',
      },
      invoiceId: {
        _id: MOCK_IDS.invoice,
        invoiceNumber: 'INV-0001',
        invoiceTitle: 'Test Invoice',
        totalAmount: 500,
        paidAmount: 200,
        paymentStatus: 'partially_paid',
      },
      clinicId: { _id: MOCK_IDS.clinic, name: 'Test Clinic' },
      addedBy: {
        _id: MOCK_IDS.user,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
      },
    };

    paymentModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateOne: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // Chainable populate for findById
    const populateChain = {
      populate: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    paymentModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(populatedPayment),
      }),
      session: jest.fn().mockReturnThis(),
    });

    // Payment constructor: returns a document-like with save
    paymentConstructorMock = jest.fn().mockImplementation((data: any) => {
      return {
        ...buildPayment(data),
        _id: PAYMENT_IDS.payment,
        save: jest.fn().mockResolvedValue(undefined),
      };
    });
    Object.assign(paymentConstructorMock, paymentModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Payment.name),
          useValue: paymentConstructorMock,
        },
        { provide: getModelToken(Invoice.name), useValue: invoiceModel },
        { provide: getModelToken(Patient.name), useValue: patientModel },
        { provide: getModelToken(Clinic.name), useValue: clinicModel },
        { provide: 'DatabaseConnection', useValue: connectionMock },
        { provide: PaymentBalanceService, useValue: paymentBalanceService },
      ],
    })
      .overrideProvider('DatabaseConnection')
      .useValue(connectionMock)
      .compile();

    service = module.get<PaymentService>(PaymentService);

    // Inject the connection directly since NestJS DI uses @InjectConnection()
    // which resolves to the default connection token
    (service as any).connection = connectionMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createPayment — validation guards
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createPayment — validation guards', () => {
    it('should throw NotFoundException when invoice does not exist', async () => {
      invoiceModel.findById.mockResolvedValue(null);
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when invoice is soft-deleted', async () => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ deletedAt: new Date() }),
      );
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invoice is not posted (draft status)', async () => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ invoiceStatus: 'draft' }),
      );
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice is cancelled', async () => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ invoiceStatus: 'cancelled' }),
      );
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is zero', async () => {
      invoiceModel.findById.mockResolvedValue(buildPostedInvoice());
      const dto = buildCreatePaymentDto({ amount: 0 });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is negative', async () => {
      invoiceModel.findById.mockResolvedValue(buildPostedInvoice());
      const dto = buildCreatePaymentDto({ amount: -50 });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount exceeds outstanding balance', async () => {
      // totalAmount=500, paidAmount=0 → outstanding=500
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ totalAmount: 500, paidAmount: 0 }),
      );
      const dto = buildCreatePaymentDto({ amount: 600 }); // 600 > 500

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow payment exactly equal to outstanding balance', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(invoice);
      patientModel.findById.mockResolvedValue(buildPatient());
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null); // paymentId uniqueness check

      const dto = buildCreatePaymentDto({ amount: 500 });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).resolves.toBeDefined();
    });

    it('should throw BadRequestException when paymentDate is in the future', async () => {
      invoiceModel.findById.mockResolvedValue(buildPostedInvoice());
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const dto = buildCreatePaymentDto({
        paymentDate: futureDate.toISOString().split('T')[0],
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invoice paymentStatus is already paid', async () => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ paymentStatus: 'paid' }),
      );
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      invoiceModel.findById.mockResolvedValue(buildPostedInvoice());
      patientModel.findById.mockResolvedValue(null);
      const dto = buildCreatePaymentDto();

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when patient does not match invoice patient', async () => {
      const otherPatientId = new Types.ObjectId();
      invoiceModel.findById.mockResolvedValue(buildPostedInvoice()); // invoice.patientId = MOCK_IDS.patient
      patientModel.findById.mockResolvedValue(buildPatient());
      const dto = buildCreatePaymentDto({
        patientId: otherPatientId.toString(), // different patient
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createPayment — sessionAllocations sum validation (ALLOCATION_SUM_MISMATCH)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createPayment — sessionAllocations validation', () => {
    beforeEach(() => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ totalAmount: 500, paidAmount: 0 }),
      );
      patientModel.findById.mockResolvedValue(buildPatient());
    });

    it('should throw BadRequestException when allocation sum does not equal payment amount', async () => {
      const dto = buildCreatePaymentDto({
        amount: 200,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 100, // total = 100, but payment amount = 200
          },
        ],
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'ALLOCATION_SUM_MISMATCH',
        }),
      });
    });

    it('should pass when allocation sum equals payment amount exactly', async () => {
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const dto = buildCreatePaymentDto({
        amount: 200,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 200, // sum = 200 = payment amount
          },
        ],
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).resolves.toBeDefined();
    });

    it('should pass when allocation sum matches within 0.01 floating-point tolerance', async () => {
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const dto = buildCreatePaymentDto({
        amount: 100,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 100.009, // within 0.01 tolerance
          },
        ],
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).resolves.toBeDefined();
    });

    it('should reject when allocation sum difference exceeds 0.01 tolerance', async () => {
      const dto = buildCreatePaymentDto({
        amount: 100,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 98, // |98 - 100| = 2 > 0.01
          },
        ],
      });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'ALLOCATION_SUM_MISMATCH',
        }),
      });
    });

    it('should call invoiceModel.updateOne for each allocation with positive amount', async () => {
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const allocations = [
        {
          invoiceId: MOCK_IDS.invoice.toString(),
          invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
          amount: 120,
        },
        {
          invoiceId: MOCK_IDS.invoice.toString(),
          invoiceItemId: MOCK_IDS.invoiceItemId2.toString(),
          amount: 80,
        },
      ];

      const dto = buildCreatePaymentDto({
        amount: 200,
        sessionAllocations: allocations,
      });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      // Should be called once per allocation
      expect(invoiceModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('should skip allocations with amount <= 0', async () => {
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const dto = buildCreatePaymentDto({
        amount: 200,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 200,
          },
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId2.toString(),
            amount: 0, // should be skipped
          },
        ],
      });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      // Only 1 updateOne call — the zero-amount allocation is skipped
      expect(invoiceModel.updateOne).toHaveBeenCalledTimes(1);
    });

    it('should use arrayFilters with invoiceItemId to target the correct session', async () => {
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
      invoiceModel.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const dto = buildCreatePaymentDto({
        amount: 150,
        sessionAllocations: [
          {
            invoiceId: MOCK_IDS.invoice.toString(),
            invoiceItemId: MOCK_IDS.invoiceItemId.toString(),
            amount: 150,
          },
        ],
      });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      const callArgs = invoiceModel.updateOne.mock.calls[0];
      const updateDoc = callArgs[1];
      const options = callArgs[2];

      expect(updateDoc.$inc).toHaveProperty('services.$[].sessions.$[item].paidAmount', 150);
      expect(options.arrayFilters).toEqual([
        { 'item.invoiceItemId': expect.any(Types.ObjectId) },
      ]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createPayment — balance delegation and transaction lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createPayment — balance service delegation', () => {
    beforeEach(() => {
      invoiceModel.findById.mockResolvedValue(
        buildPostedInvoice({ totalAmount: 500, paidAmount: 0 }),
      );
      patientModel.findById.mockResolvedValue(buildPatient());
      paymentModel.countDocuments.mockResolvedValue(0);
      paymentModel.findOne.mockResolvedValue(null);
    });

    it('should delegate balance update to PaymentBalanceService', async () => {
      const dto = buildCreatePaymentDto({ amount: 200 });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      expect(paymentBalanceService.updateInvoiceBalances).toHaveBeenCalledWith(
        dto.invoiceId,
        dto.amount,
        sessionMock,
      );
    });

    it('should commit the transaction on success', async () => {
      const dto = buildCreatePaymentDto({ amount: 200 });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      expect(sessionMock.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('should end the session regardless of outcome', async () => {
      const dto = buildCreatePaymentDto({ amount: 200 });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      expect(sessionMock.endSession).toHaveBeenCalledTimes(1);
    });

    it('should abort the transaction and rethrow when an error occurs', async () => {
      const db_error = new Error('Database write failed');
      paymentBalanceService.updateInvoiceBalances.mockRejectedValue(db_error);
      const dto = buildCreatePaymentDto({ amount: 200 });

      await expect(
        service.createPayment(dto, MOCK_IDS.user.toString()),
      ).rejects.toThrow('Database write failed');

      expect(sessionMock.abortTransaction).toHaveBeenCalledTimes(1);
      expect(sessionMock.endSession).toHaveBeenCalledTimes(1);
    });

    it('should update lastPaymentDate on the invoice after payment', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      invoiceModel.findById.mockResolvedValue(invoice);
      const dto = buildCreatePaymentDto({ paymentDate: '2024-03-20', amount: 100 });

      await service.createPayment(dto, MOCK_IDS.user.toString());

      expect(invoice.lastPaymentDate).toEqual(new Date('2024-03-20'));
    });
  });
});
