import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvoiceNumberService } from '../../../src/invoice/invoice-number.service';
import { Counter } from '../../../src/database/schemas/counter.schema';

/**
 * Unit tests for InvoiceNumberService
 *
 * Covers:
 * - generateDraftNumber  — DFT-xxxx format, per-tenant keying, atomic counter
 * - generatePostedNumber — INV-xxxx format, per-tenant keying, atomic counter
 * - validateInvoiceNumberFormat — pattern validation helper
 * - isDraftNumber / isPostedNumber — type-guard helpers
 * - padNumber behaviour — 1→0001, 42→0042, 1000→1000
 */
describe('InvoiceNumberService', () => {
  let service: InvoiceNumberService;
  let counterModel: { findOneAndUpdate: jest.Mock };

  beforeEach(async () => {
    counterModel = { findOneAndUpdate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceNumberService,
        {
          provide: getModelToken(Counter.name),
          useValue: counterModel,
        },
      ],
    }).compile();

    service = module.get<InvoiceNumberService>(InvoiceNumberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // generateDraftNumber
  // ───────────────────────────────────────────────────────────────────────────
  describe('generateDraftNumber', () => {
    it('should return DFT-0001 for the first counter increment', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      const result = await service.generateDraftNumber('org-abc');

      expect(result).toBe('DFT-0001');
    });

    it('should use key DFT:{organizationId} when calling the counter', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      await service.generateDraftNumber('org-abc');

      expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'DFT:org-abc' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
      );
    });

    it('should use key DFT:global when no organizationId provided', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      await service.generateDraftNumber();

      expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'DFT:global' },
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should pad a two-digit sequence to four digits', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 42 });

      const result = await service.generateDraftNumber('org-abc');

      expect(result).toBe('DFT-0042');
    });

    it('should handle sequences exactly at 1000 without truncation', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1000 });

      const result = await service.generateDraftNumber('org-abc');

      expect(result).toBe('DFT-1000');
    });

    it('should isolate counters per-organization (different keys per org)', async () => {
      counterModel.findOneAndUpdate
        .mockResolvedValueOnce({ seq: 5 })  // org-A
        .mockResolvedValueOnce({ seq: 1 }); // org-B

      const numA = await service.generateDraftNumber('org-A');
      const numB = await service.generateDraftNumber('org-B');

      expect(numA).toBe('DFT-0005');
      expect(numB).toBe('DFT-0001');
      expect(counterModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should call counterModel with upsert:true for first-time org', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      await service.generateDraftNumber('brand-new-org');

      expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ upsert: true, new: true }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // generatePostedNumber
  // ───────────────────────────────────────────────────────────────────────────
  describe('generatePostedNumber', () => {
    it('should return INV-0001 for the first counter increment', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      const result = await service.generatePostedNumber('org-abc');

      expect(result).toBe('INV-0001');
    });

    it('should use key INV:{organizationId} when calling the counter', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      await service.generatePostedNumber('org-abc');

      expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'INV:org-abc' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
      );
    });

    it('should use key INV:global when no organizationId provided', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 1 });

      await service.generatePostedNumber();

      expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'INV:global' },
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should pad a two-digit sequence to four digits', async () => {
      counterModel.findOneAndUpdate.mockResolvedValue({ seq: 7 });

      const result = await service.generatePostedNumber('org-abc');

      expect(result).toBe('INV-0007');
    });

    it('should return different numbers for DFT and INV series (separate counters)', async () => {
      // DFT counter is at seq 10, INV counter is at seq 3
      counterModel.findOneAndUpdate
        .mockResolvedValueOnce({ seq: 10 })
        .mockResolvedValueOnce({ seq: 3 });

      const draftNum = await service.generateDraftNumber('org-x');
      const postedNum = await service.generatePostedNumber('org-x');

      expect(draftNum).toBe('DFT-0010');
      expect(postedNum).toBe('INV-0003');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // validateInvoiceNumberFormat
  // ───────────────────────────────────────────────────────────────────────────
  describe('validateInvoiceNumberFormat', () => {
    it('should return true for a valid DFT-xxxx number', () => {
      expect(service.validateInvoiceNumberFormat('DFT-0001')).toBe(true);
    });

    it('should return true for a valid INV-xxxx number', () => {
      expect(service.validateInvoiceNumberFormat('INV-0042')).toBe(true);
    });

    it('should return false for a number with fewer than 4 digits', () => {
      expect(service.validateInvoiceNumberFormat('DFT-001')).toBe(false);
    });

    it('should return false for a number with more than 4 digits', () => {
      expect(service.validateInvoiceNumberFormat('INV-00001')).toBe(false);
    });

    it('should return false for an unknown prefix', () => {
      expect(service.validateInvoiceNumberFormat('PAY-0001')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(service.validateInvoiceNumberFormat('')).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // isDraftNumber / isPostedNumber
  // ───────────────────────────────────────────────────────────────────────────
  describe('isDraftNumber', () => {
    it('should return true for DFT-0001', () => {
      expect(service.isDraftNumber('DFT-0001')).toBe(true);
    });

    it('should return false for INV-0001', () => {
      expect(service.isDraftNumber('INV-0001')).toBe(false);
    });
  });

  describe('isPostedNumber', () => {
    it('should return true for INV-0001', () => {
      expect(service.isPostedNumber('INV-0001')).toBe(true);
    });

    it('should return false for DFT-0001', () => {
      expect(service.isPostedNumber('DFT-0001')).toBe(false);
    });
  });
});
