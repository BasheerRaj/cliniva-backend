import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppointmentValidationService } from './appointment-validation.service';

describe('AppointmentValidationService', () => {
  let service: AppointmentValidationService;

  const doctorServiceModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentValidationService,
        { provide: getModelToken('Patient'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: getModelToken('Service'), useValue: {} },
        { provide: getModelToken('Clinic'), useValue: {} },
        { provide: getModelToken('Department'), useValue: {} },
        { provide: getModelToken('ClinicService'), useValue: {} },
        { provide: getModelToken('DoctorService'), useValue: doctorServiceModel },
      ],
    }).compile();

    service = module.get<AppointmentValidationService>(AppointmentValidationService);
  });

  it('rejects booking when the doctor is not assigned to the service in the clinic', async () => {
    doctorServiceModel.findOne.mockResolvedValue(null);

    await expect(
      service.validateDoctorServiceAuthorization(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('accepts booking when the doctor has an active assignment for the service in the clinic', async () => {
    doctorServiceModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(),
      isActive: true,
    });

    await expect(
      service.validateDoctorServiceAuthorization(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
    ).resolves.toBeUndefined();
  });
});
