import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceService } from './invoice.service';

function createFindChain(result: any[] = []) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

function createClinicFindByIdChain(subscriptionId: string) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      subscriptionId: new Types.ObjectId(subscriptionId),
    }),
  };
}

describe('InvoiceService tenant scoping', () => {
  const subscriptionId = new Types.ObjectId().toString();
  const clinicId = new Types.ObjectId().toString();

  let invoiceModel: any;
  let patientModel: any;
  let serviceModel: any;
  let clinicModel: any;
  let counterModel: any;
  let paymentModel: any;
  let invoiceNumberService: any;
  let service: InvoiceService;

  beforeEach(() => {
    invoiceModel = {
      find: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      collection: {
        indexes: jest.fn().mockResolvedValue([]),
        dropIndex: jest.fn(),
      },
    };
    patientModel = {};
    serviceModel = { find: jest.fn() };
    clinicModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };
    counterModel = {};
    paymentModel = {};
    invoiceNumberService = {};

    service = new InvoiceService(
      invoiceModel,
      patientModel,
      serviceModel,
      clinicModel,
      counterModel,
      paymentModel,
      invoiceNumberService,
    );
  });

  it('scopes clinic-bound invoice list queries by subscription for clinic-less invoices', async () => {
    const findChain = createFindChain();
    invoiceModel.find.mockReturnValue(findChain);

    await service.getInvoices(
      { page: 1, limit: 10 } as any,
      'staff',
      subscriptionId,
      clinicId,
      undefined,
      undefined,
    );

    const filter = invoiceModel.find.mock.calls[0][0];
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].clinicId.$in).toHaveLength(1);
    expect(filter.$or[0].clinicId.$in[0].toString()).toBe(clinicId);
    expect(filter.$or[1].clinicId).toEqual({ $exists: false });
    expect(filter.$or[1].subscriptionId.toString()).toBe(subscriptionId);
  });

  it('scopes payable-patient queries by subscription for clinic-less invoices', async () => {
    const findChain = createFindChain();
    invoiceModel.find.mockReturnValue(findChain);

    await service.getPatientsWithPayableInvoices(
      undefined,
      'doctor',
      clinicId,
      undefined,
      subscriptionId,
    );

    const filter = invoiceModel.find.mock.calls[0][0];
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].clinicId.$in).toHaveLength(1);
    expect(filter.$or[0].clinicId.$in[0].toString()).toBe(clinicId);
    expect(filter.$or[1].clinicId).toEqual({ $exists: false });
    expect(filter.$or[1].subscriptionId.toString()).toBe(subscriptionId);
  });

  it('scopes booking invoice lookups by subscription for clinic-less invoices', async () => {
    const findChain = createFindChain();
    invoiceModel.find.mockReturnValue(findChain);
    clinicModel.findById.mockReturnValue(
      createClinicFindByIdChain(subscriptionId),
    );

    await expect(
      service.getInvoiceForBooking(
        new Types.ObjectId().toString(),
        clinicId,
        undefined,
        undefined,
        'staff',
        clinicId,
        {
          role: 'staff',
          clinicId,
          subscriptionId,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const filter = invoiceModel.find.mock.calls[0][0];
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].clinicId.toString()).toBe(clinicId);
    expect(filter.$or[1].clinicId).toEqual({ $exists: false });
    expect(filter.$or[1].subscriptionId.toString()).toBe(subscriptionId);
  });
});
