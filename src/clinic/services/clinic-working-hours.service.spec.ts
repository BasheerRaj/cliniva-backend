import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClinicWorkingHoursService } from './clinic-working-hours.service';
import { Clinic } from '../../database/schemas/clinic.schema';
import { Complex } from '../../database/schemas/complex.schema';
import { WorkingHours } from '../../database/schemas/working-hours.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { User } from '../../database/schemas/user.schema';

describe('ClinicWorkingHoursService', () => {
  let service: ClinicWorkingHoursService;
  let mockClinicModel: any;
  let mockComplexModel: any;
  let mockWorkingHoursModel: any;
  let mockAppointmentModel: any;
  let mockUserModel: any;

  const mockClinicId = new Types.ObjectId().toString();
  const mockComplexId = new Types.ObjectId();

  const mockClinic = {
    _id: new Types.ObjectId(mockClinicId),
    name: 'Test Clinic',
    complexId: mockComplexId,
  };

  beforeEach(async () => {
    // Create mocks
    mockClinicModel = {
      findById: jest.fn(),
    };

    mockComplexModel = {
      findById: jest.fn(),
    };

    mockWorkingHoursModel = {
      find: jest.fn(),
    };

    mockAppointmentModel = {
      find: jest.fn(),
    };

    mockUserModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicWorkingHoursService,
        {
          provide: getModelToken('Clinic'),
          useValue: mockClinicModel,
        },
        {
          provide: getModelToken('Complex'),
          useValue: mockComplexModel,
        },
        {
          provide: getModelToken('WorkingHours'),
          useValue: mockWorkingHoursModel,
        },
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<ClinicWorkingHoursService>(ClinicWorkingHoursService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWorkingHours', () => {
    it('should validate working hours successfully when within complex hours', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.conflicts.appointments).toHaveLength(0);
      expect(result.requiresRescheduling).toBe(false);
      expect(result.affectedAppointments).toBe(0);
    });

    it('should reject hours when clinic open and complex closed', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: false,
          openingTime: null,
          closingTime: null,
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'friday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].dayOfWeek).toBe('friday');
      expect(result.errors[0].message.en).toContain('cannot be open');
      expect(result.errors[0].message.en).toContain('when complex is closed');
      expect(result.errors[0].message.ar).toContain('لا يمكن فتح العيادة');
    });

    it('should reject hours outside complex hours', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00', // Before complex opens
          closingTime: '18:00', // After complex closes
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].dayOfWeek).toBe('monday');
      expect(result.errors[0].message.en).toContain(
        'must be within complex hours',
      );
      expect(result.errors[0].message.ar).toContain(
        'يجب أن تكون ضمن ساعات المجمع',
      );
      expect(result.errors[0].complexHours).toEqual({
        openingTime: '09:00',
        closingTime: '17:00',
      });
      expect(result.errors[0].clinicHours).toEqual({
        openingTime: '08:00',
        closingTime: '18:00',
      });
    });

    it('should detect appointment conflicts on non-working days', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false, // Clinic closed on Monday
        },
      ];

      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: nextMonday,
          appointmentTime: '10:00',
          status: 'scheduled',
          patientId: {
            firstName: 'John',
            lastName: 'Doe',
          },
          doctorId: {
            firstName: 'Dr. Jane',
            lastName: 'Smith',
          },
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointments),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.conflicts.appointments).toHaveLength(1);
      expect(result.conflicts.appointments[0].type).toBe('appointment');
      expect(result.conflicts.appointments[0].name).toBe('John Doe');
      expect(result.conflicts.appointments[0].reason.en).toContain(
        'non-working day',
      );
      expect(result.conflicts.appointments[0].reason.ar).toContain(
        'يوم غير عمل',
      );
      expect(result.requiresRescheduling).toBe(true);
      expect(result.affectedAppointments).toBe(1);
    });

    it('should detect appointment conflicts outside working hours', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '10:00', // Clinic opens later
          closingTime: '16:00', // Clinic closes earlier
        },
      ];

      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: nextMonday,
          appointmentTime: '09:00', // Before new opening time
          status: 'scheduled',
          patientId: {
            firstName: 'John',
            lastName: 'Doe',
          },
          doctorId: {
            firstName: 'Dr. Jane',
            lastName: 'Smith',
          },
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: nextMonday,
          appointmentTime: '17:00', // After new closing time
          status: 'confirmed',
          patientId: {
            firstName: 'Alice',
            lastName: 'Johnson',
          },
          doctorId: {
            firstName: 'Dr. Bob',
            lastName: 'Brown',
          },
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointments),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.conflicts.appointments).toHaveLength(2);
      expect(result.conflicts.appointments[0].reason.en).toContain(
        'outside new working hours',
      );
      expect(result.conflicts.appointments[0].reason.ar).toContain(
        'خارج ساعات العمل الجديدة',
      );
      expect(result.requiresRescheduling).toBe(true);
      expect(result.affectedAppointments).toBe(2);
    });

    it('should return bilingual error messages', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false,
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.errors[0].message).toHaveProperty('ar');
      expect(result.errors[0].message).toHaveProperty('en');
      expect(result.errors[0].message.ar).toBeTruthy();
      expect(result.errors[0].message.en).toBeTruthy();
      expect(result.errors[0].message.ar).toContain('الاثنين'); // Arabic day name
    });

    it('should throw NotFoundException for invalid clinic', async () => {
      // Arrange
      mockClinicModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.validateWorkingHours(mockClinicId, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when clinic has no complex', async () => {
      // Arrange
      const clinicWithoutComplex = {
        ...mockClinic,
        complexId: null,
      };

      mockClinicModel.findById.mockResolvedValue(clinicWithoutComplex);

      // Act & Assert
      await expect(
        service.validateWorkingHours(mockClinicId, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle appointments with missing patient data gracefully', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false,
        },
      ];

      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: nextMonday,
          appointmentTime: '10:00',
          status: 'scheduled',
          patientId: null, // Missing patient data
          doctorId: {
            firstName: 'Dr. Jane',
            lastName: 'Smith',
          },
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointments),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.conflicts.appointments).toHaveLength(1);
      expect(result.conflicts.appointments[0].name).toBe('Unknown Patient');
    });

    it('should skip validation when clinic hours have no opening/closing times', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: null, // Missing times
          closingTime: null,
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', async () => {
      // Arrange
      const complexHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false,
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const proposedHours = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '08:00',
          closingTime: '18:00',
        },
      ];

      mockClinicModel.findById.mockResolvedValue(mockClinic);
      mockWorkingHoursModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(complexHours),
      });
      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.validateWorkingHours(
        mockClinicId,
        proposedHours as any,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].dayOfWeek).toBe('monday');
      expect(result.errors[1].dayOfWeek).toBe('tuesday');
    });
  });
});
