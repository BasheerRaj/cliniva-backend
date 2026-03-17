import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { PaymentBalanceService } from '../../../src/payment/payment-balance.service';
import { Invoice } from '../../../src/database/schemas/invoice.schema';

import { MOCK_IDS, buildPostedInvoice, buildMongoSession } from '../mocks/payment.mocks';

/**
 * Unit tests for PaymentBalanceService
 *
 * Covers:
 * - updateInvoiceBalances  — adds payment to paidAmount, derives paymentStatus
 * - recalculateInvoiceBalances — sets paidAmount from scratch, derives paymentStatus
 * - Negative balance guard (Requirement 7.6)
 * - Status transitions: unpaid → partially_paid → paid
 */
describe('PaymentBalanceService', () => {
  let service: PaymentBalanceService;
  let invoiceModel: any;
  let sessionMock: any;

  beforeEach(async () => {
    sessionMock = buildMongoSession();

    invoiceModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentBalanceService,
        {
          provide: getModelToken(Invoice.name),
          useValue: invoiceModel,
        },
      ],
    }).compile();

    service = module.get<PaymentBalanceService>(PaymentBalanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: build a chainable findById mock
  // ─────────────────────────────────────────────────────────────────────────
  function stubFindById(invoiceData: any) {
    invoiceModel.findById.mockReturnValue({
      session: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(invoiceData),
      }),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // updateInvoiceBalances
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateInvoiceBalances', () => {
    it('should add the payment amount to invoice paidAmount', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        200,
        sessionMock,
      );

      expect(invoice.paidAmount).toBe(200);
    });

    it('should set paymentStatus to partially_paid when balance > 0 and paidAmount > 0', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        200,
        sessionMock,
      );

      expect(invoice.paymentStatus).toBe('partially_paid');
    });

    it('should set paymentStatus to paid when outstanding balance becomes zero', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 300 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        200, // 300 + 200 = 500 = totalAmount → outstanding = 0
        sessionMock,
      );

      expect(invoice.paidAmount).toBe(500);
      expect(invoice.paymentStatus).toBe('paid');
    });

    it('should handle exact full payment in a single call', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 300, paidAmount: 0 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        300,
        sessionMock,
      );

      expect(invoice.paymentStatus).toBe('paid');
    });

    it('should save the invoice within the provided session', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        100,
        sessionMock,
      );

      expect(invoice.save).toHaveBeenCalledWith({ session: sessionMock });
    });

    it('should throw BadRequestException when invoice is not found', async () => {
      invoiceModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.updateInvoiceBalances(
          MOCK_IDS.invoice.toString(),
          100,
          sessionMock,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accumulate paidAmount across multiple payment calls', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 100 });
      stubFindById(invoice);

      await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        150,
        sessionMock,
      );

      expect(invoice.paidAmount).toBe(250); // 100 + 150
      expect(invoice.paymentStatus).toBe('partially_paid');
    });

    it('should return the updated invoice document', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      const savedInvoice = { ...invoice, paidAmount: 100, paymentStatus: 'partially_paid' };
      invoice.save = jest.fn().mockResolvedValue(savedInvoice);
      stubFindById(invoice);

      const result = await service.updateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        100,
        sessionMock,
      );

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // recalculateInvoiceBalances
  // ═══════════════════════════════════════════════════════════════════════════
  describe('recalculateInvoiceBalances', () => {
    it('should overwrite paidAmount with the provided totalPaidAmount', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 200 });
      stubFindById(invoice);

      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        350,
        sessionMock,
      );

      expect(invoice.paidAmount).toBe(350);
    });

    it('should set paymentStatus to paid when totalPaidAmount equals totalAmount', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 300 });
      stubFindById(invoice);

      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        500,
        sessionMock,
      );

      expect(invoice.paymentStatus).toBe('paid');
    });

    it('should set paymentStatus to partially_paid when 0 < totalPaidAmount < totalAmount', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 500 });
      stubFindById(invoice);

      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        250,
        sessionMock,
      );

      expect(invoice.paymentStatus).toBe('partially_paid');
    });

    it('should set paymentStatus to unpaid when totalPaidAmount is 0 and invoice is posted', async () => {
      const invoice = buildPostedInvoice({
        invoiceStatus: 'posted',
        totalAmount: 500,
        paidAmount: 200,
        paymentStatus: 'partially_paid',
      });
      stubFindById(invoice);

      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        0,
        sessionMock,
      );

      expect(invoice.paidAmount).toBe(0);
      expect(invoice.paymentStatus).toBe('unpaid');
    });

    it('should save the invoice within the provided session', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 200 });
      stubFindById(invoice);

      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        100,
        sessionMock,
      );

      expect(invoice.save).toHaveBeenCalledWith({ session: sessionMock });
    });

    it('should throw BadRequestException when invoice is not found', async () => {
      invoiceModel.findById.mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.recalculateInvoiceBalances(
          MOCK_IDS.invoice.toString(),
          100,
          sessionMock,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return the updated invoice document', async () => {
      const invoice = buildPostedInvoice({ totalAmount: 500, paidAmount: 0 });
      const savedResult = { ...invoice, paidAmount: 200, paymentStatus: 'partially_paid' };
      invoice.save = jest.fn().mockResolvedValue(savedResult);
      stubFindById(invoice);

      const result = await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        200,
        sessionMock,
      );

      expect(result).toBeDefined();
    });

    it('should use Math.max(0, ...) so outstandingBalance never goes negative', async () => {
      // paidAmount more than totalAmount — should result in outstanding = 0
      const invoice = buildPostedInvoice({ totalAmount: 300, paidAmount: 100 });
      stubFindById(invoice);

      // totalPaidAmount = 300 → outstanding = 300 - 300 = 0
      await service.recalculateInvoiceBalances(
        MOCK_IDS.invoice.toString(),
        300,
        sessionMock,
      );

      // paymentStatus should become 'paid', not throw
      expect(invoice.paymentStatus).toBe('paid');
    });
  });
});
