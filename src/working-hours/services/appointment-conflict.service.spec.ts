import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AppointmentConflictService } from './appointment-conflict.service';
import { Types } from 'mongoose';

/**
 * Unit Tests for AppointmentConflictService
 *
 * Tests the conflict detection logic for appointments when updating doctor working hours.
 *
 * Business Rules Tested:
 * - BZR-l9e0f1c4: Detect appointments outside new working hours
 * - BZR-43: Identify appointments requiring rescheduling
 *
 * Test Coverage:
 * - checkConflicts() method with various scenarios
 * - getAppointmentsByDay() method
 * - isAppointmentWithinHours() method
 * - Conflict detection for non-working days
 * - Conflict detection for appointments before opening time
 * - Conflict detection for appointments after closing time
 * - Conflict detection for appointments during break time
 * - No conflicts scenario
 * - Conflict counting
 */
describe('AppointmentConflictService', () => {
  let service: AppointmentConflictService;
  let mockAppointmentModel: any;

  const doctorId = new Types.ObjectId();
  const patientId = new Types.ObjectId();
  const clinicId = new Types.ObjectId();
  const serviceId = new Types.ObjectId();

  beforeEach(async () => {
    // Mock the Appointment model
    mockAppointmentModel = {
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      aggregate: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentConflictService,
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
      ],
    }).compile();

    service = module.get<AppointmentConflictService>(
      AppointmentConflictService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkConflicts', () => {
    it('should detect no conflicts when all appointments are within new working hours', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7); // Next week Monday

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: futureDate,
          appointmentTime: '10:00',
          durationMinutes: 30,
          patient: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      mockAppointmentModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(result.affectedAppointments).toBe(0);
      expect(mockAppointmentModel.aggregate).toHaveBeenCalled();
    });

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(result.affectedAppointments).toBe(0);
      expect(result.requiresRescheduling).toBe(false);
    });

    it('should detect conflicts when appointment is on non-working day', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7); // Next week Monday

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'John',
            lastName: 'Doe',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false, // Monday is now non-working day
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.affectedAppointments).toBe(1);
      expect(result.requiresRescheduling).toBe(true);
      expect(result.conflicts[0].patientName).toBe('John Doe');
      expect(result.conflicts[0].conflictReason).toHaveProperty('ar');
      expect(result.conflicts[0].conflictReason).toHaveProperty('en');
    });

    it('should detect conflicts when appointment is before opening time', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7);

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'Jane',
            lastName: 'Smith',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate,
          appointmentTime: '08:00', // Before opening time
          durationMinutes: 30,
          status: 'confirmed',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00', // Opens at 9 AM
          closingTime: '17:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.affectedAppointments).toBe(1);
      expect(result.requiresRescheduling).toBe(true);
      expect(result.conflicts[0].appointmentTime).toBe('08:00');
      expect(result.conflicts[0].conflictReason.en).toContain('before new opening time');
    });

    it('should detect conflicts when appointment ends after closing time', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7);

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'Bob',
            lastName: 'Johnson',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate,
          appointmentTime: '16:45', // Ends at 17:15, after closing
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00', // Closes at 5 PM
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.affectedAppointments).toBe(1);
      expect(result.requiresRescheduling).toBe(true);
      expect(result.conflicts[0].conflictReason.en).toContain('after new closing time');
    });

    it('should detect conflicts when appointment is during break time', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7);

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'Alice',
            lastName: 'Williams',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate,
          appointmentTime: '12:15', // During break time
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.affectedAppointments).toBe(1);
      expect(result.requiresRescheduling).toBe(true);
      expect(result.conflicts[0].conflictReason.en).toContain('break time');
    });

    it('should count multiple conflicts correctly', async () => {
      const today = new Date();
      const futureDate1 = new Date(today);
      futureDate1.setDate(futureDate1.getDate() + 7); // Monday
      const futureDate2 = new Date(today);
      futureDate2.setDate(futureDate2.getDate() + 8); // Tuesday

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'Patient',
            lastName: 'One',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate1,
          appointmentTime: '08:00', // Before opening
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: new Types.ObjectId(),
            firstName: 'Patient',
            lastName: 'Two',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate2,
          appointmentTime: '18:00', // After closing
          durationMinutes: 30,
          status: 'confirmed',
          deletedAt: null,
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: new Types.ObjectId(),
            firstName: 'Patient',
            lastName: 'Three',
          },
          clinicId,
          serviceId,
          appointmentDate: futureDate1,
          appointmentTime: '12:30', // During break
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
        },
        {
          dayOfWeek: 'tuesday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(3);
      expect(result.affectedAppointments).toBe(3);
      expect(result.requiresRescheduling).toBe(true);
    });

    it('should handle appointments with unknown patient gracefully', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 7);

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: null, // No patient populated
          clinicId,
          serviceId,
          appointmentDate: futureDate,
          appointmentTime: '08:00',
          durationMinutes: 30,
          status: 'scheduled',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      const result = await service.checkConflicts(
        doctorId.toString(),
        newSchedule,
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].patientName).toBe('Unknown Patient');
    });

    it('should only check future appointments', async () => {
      mockAppointmentModel.exec.mockResolvedValue([]);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      await service.checkConflicts(doctorId.toString(), newSchedule);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: expect.any(Types.ObjectId),
          appointmentDate: expect.objectContaining({ $gte: expect.any(Date) }),
          status: { $in: ['scheduled', 'confirmed'] },
          deletedAt: null,
        }),
      );
    });

    it('should only check scheduled and confirmed appointments', async () => {
      mockAppointmentModel.exec.mockResolvedValue([]);

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      await service.checkConflicts(doctorId.toString(), newSchedule);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['scheduled', 'confirmed'] },
        }),
      );
    });
  });

  describe('getAppointmentsByDay', () => {
    it('should return appointments for specific day of week', async () => {
      const today = new Date();
      const monday1 = new Date(today);
      monday1.setDate(monday1.getDate() + 7); // Next Monday
      const monday2 = new Date(today);
      monday2.setDate(monday2.getDate() + 14); // Monday after next
      const tuesday = new Date(today);
      tuesday.setDate(tuesday.getDate() + 8); // Next Tuesday

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: patientId,
            firstName: 'Monday',
            lastName: 'Patient1',
          },
          appointmentDate: monday1,
          appointmentTime: '10:00',
          status: 'scheduled',
          deletedAt: null,
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: new Types.ObjectId(),
            firstName: 'Tuesday',
            lastName: 'Patient',
          },
          appointmentDate: tuesday,
          appointmentTime: '11:00',
          status: 'scheduled',
          deletedAt: null,
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: {
            _id: new Types.ObjectId(),
            firstName: 'Monday',
            lastName: 'Patient2',
          },
          appointmentDate: monday2,
          appointmentTime: '14:00',
          status: 'confirmed',
          deletedAt: null,
        },
      ];

      mockAppointmentModel.exec.mockResolvedValue(mockAppointments);

      const result = await service.getAppointmentsByDay(
        doctorId.toString(),
        'monday',
        today,
      );

      expect(result).toHaveLength(2);
      expect(result[0].patientId.firstName).toBe('Monday');
      expect(result[1].patientId.firstName).toBe('Monday');
    });

    it('should return empty array when no appointments on that day', async () => {
      const today = new Date();

      mockAppointmentModel.exec.mockResolvedValue([]);

      const result = await service.getAppointmentsByDay(
        doctorId.toString(),
        'monday',
        today,
      );

      expect(result).toHaveLength(0);
    });

    it('should filter by fromDate correctly', async () => {
      const today = new Date();

      mockAppointmentModel.exec.mockResolvedValue([]);

      await service.getAppointmentsByDay(
        doctorId.toString(),
        'monday',
        today,
      );

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentDate: { $gte: today },
        }),
      );
    });
  });

  describe('isAppointmentWithinHours', () => {
    const mockAppointment = {
      _id: new Types.ObjectId(),
      appointmentTime: '10:00',
      durationMinutes: 30,
    } as any;

    it('should return false when working hours are undefined', () => {
      const result = service.isAppointmentWithinHours(
        mockAppointment,
        undefined,
      );

      expect(result).toBe(false);
    });

    it('should return false when day is not a working day', () => {
      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: false,
      };

      const result = service.isAppointmentWithinHours(
        mockAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return true when working hours have no time constraints', () => {
      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: undefined,
        closingTime: undefined,
      };

      const result = service.isAppointmentWithinHours(
        mockAppointment,
        workingHours,
      );

      expect(result).toBe(true);
    });

    it('should return true when appointment is within working hours', () => {
      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      };

      const result = service.isAppointmentWithinHours(
        mockAppointment,
        workingHours,
      );

      expect(result).toBe(true);
    });

    it('should return false when appointment starts before opening time', () => {
      const earlyAppointment = {
        ...mockAppointment,
        appointmentTime: '08:00',
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      };

      const result = service.isAppointmentWithinHours(
        earlyAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return false when appointment ends after closing time', () => {
      const lateAppointment = {
        ...mockAppointment,
        appointmentTime: '16:45',
        durationMinutes: 30, // Ends at 17:15
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      };

      const result = service.isAppointmentWithinHours(
        lateAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return false when appointment starts during break time', () => {
      const breakAppointment = {
        ...mockAppointment,
        appointmentTime: '12:15',
        durationMinutes: 30,
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      const result = service.isAppointmentWithinHours(
        breakAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return false when appointment ends during break time', () => {
      const breakAppointment = {
        ...mockAppointment,
        appointmentTime: '11:45',
        durationMinutes: 30, // Ends at 12:15, during break
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      const result = service.isAppointmentWithinHours(
        breakAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return false when appointment spans entire break time', () => {
      const longAppointment = {
        ...mockAppointment,
        appointmentTime: '11:30',
        durationMinutes: 120, // Ends at 13:30, spans entire break
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      const result = service.isAppointmentWithinHours(
        longAppointment,
        workingHours,
      );

      expect(result).toBe(false);
    });

    it('should return true when appointment is before break time', () => {
      const beforeBreakAppointment = {
        ...mockAppointment,
        appointmentTime: '11:00',
        durationMinutes: 30, // Ends at 11:30, before break
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      const result = service.isAppointmentWithinHours(
        beforeBreakAppointment,
        workingHours,
      );

      expect(result).toBe(true);
    });

    it('should return true when appointment is after break time', () => {
      const afterBreakAppointment = {
        ...mockAppointment,
        appointmentTime: '13:30',
        durationMinutes: 30, // Ends at 14:00, after break
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
      };

      const result = service.isAppointmentWithinHours(
        afterBreakAppointment,
        workingHours,
      );

      expect(result).toBe(true);
    });

    it('should use default duration of 30 minutes when not specified', () => {
      const appointmentWithoutDuration = {
        ...mockAppointment,
        appointmentTime: '16:45',
        durationMinutes: undefined,
      };

      const workingHours = {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        openingTime: '09:00',
        closingTime: '17:00',
      };

      const result = service.isAppointmentWithinHours(
        appointmentWithoutDuration,
        workingHours,
      );

      // Should use 30 min default, ending at 17:15, which is after closing
      expect(result).toBe(false);
    });
  });
});
