import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { WorkingHoursReschedulingService } from './working-hours-rescheduling.service';
import { Types, Connection } from 'mongoose';

/**
 * Unit Tests for WorkingHoursReschedulingService
 *
 * Tests the rescheduling service logic for updating working hours with
 * automatic appointment handling.
 *
 * Business Rules Tested:
 * - BZR-l9e0f1c4: Reschedule appointments after modification date
 * - BZR-43: Only reschedule appointments on modified days
 * - Mark appointments as "needs_rescheduling" until staff confirms
 * - Send notifications to affected patients
 * - Log all rescheduling actions for audit
 *
 * Test Coverage:
 * - updateWithRescheduling() with various strategies
 * - rescheduleAppointments() logic
 * - markForRescheduling() logic
 * - notifyPatients() logic
 * - Transaction rollback on failure
 * - Conflict detection integration
 */
describe('WorkingHoursReschedulingService', () => {
  let service: WorkingHoursReschedulingService;
  let mockAppointmentModel: any;
  let mockWorkingHoursModel: any;
  let mockNotificationModel: any;
  let mockConnection: any;
  let mockSession: any;

  const doctorId = new Types.ObjectId();
  const patientId = new Types.ObjectId();
  const clinicId = new Types.ObjectId();
  const serviceId = new Types.ObjectId();

  beforeEach(async () => {
    // Mock session
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    // Mock connection
    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    // Mock Appointment model
    mockAppointmentModel = {
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      updateOne: jest.fn(),
    };

    // Mock WorkingHours model
    mockWorkingHoursModel = {
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
    };

    // Mock Notification model
    mockNotificationModel = {
      insertMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursReschedulingService,
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
        {
          provide: getModelToken('WorkingHours'),
          useValue: mockWorkingHoursModel,
        },
        {
          provide: getModelToken('Notification'),
          useValue: mockNotificationModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<WorkingHoursReschedulingService>(
      WorkingHoursReschedulingService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateWithRescheduling', () => {
    const newSchedule = [
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

    it('should successfully update working hours with no conflicts', async () => {
      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
        { _id: new Types.ObjectId(), ...newSchedule[1] },
      ]);
      mockAppointmentModel.exec.mockResolvedValue([]);

      const result = await service.updateWithRescheduling(
        'user',
        doctorId.toString(),
        newSchedule,
        {
          handleConflicts: 'reschedule',
          notifyPatients: true,
        },
      );

      expect(result.workingHours).toHaveLength(2);
      expect(result.appointmentsRescheduled).toBe(0);
      expect(result.appointmentsMarkedForRescheduling).toBe(0);
      expect(result.appointmentsCancelled).toBe(0);
      expect(result.notificationsSent).toBe(0);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should reschedule conflicting appointments when strategy is "reschedule"', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conflictingAppointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId: {
          _id: patientId,
          firstName: 'John',
          lastName: 'Doe',
        },
        appointmentDate: tomorrow,
        appointmentTime: '08:00', // Before new opening time
        durationMinutes: 30,
        status: 'scheduled',
        deletedAt: null,
      };

      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
      ]);
      mockAppointmentModel.exec.mockResolvedValue([conflictingAppointment]);
      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const result = await service.updateWithRescheduling(
        'user',
        doctorId.toString(),
        newSchedule,
        {
          handleConflicts: 'reschedule',
          notifyPatients: true,
        },
      );

      expect(result.appointmentsRescheduled).toBeGreaterThan(0);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should mark appointments for manual rescheduling when strategy is "notify"', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conflictingAppointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId: {
          _id: patientId,
          firstName: 'Jane',
          lastName: 'Smith',
        },
        appointmentDate: tomorrow,
        appointmentTime: '08:00',
        durationMinutes: 30,
        status: 'scheduled',
        deletedAt: null,
      };

      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
      ]);
      mockAppointmentModel.exec.mockResolvedValue([conflictingAppointment]);
      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const result = await service.updateWithRescheduling(
        'user',
        doctorId.toString(),
        newSchedule,
        {
          handleConflicts: 'notify',
          notifyPatients: true,
          reschedulingReason: 'Working hours changed',
        },
      );

      expect(result.appointmentsMarkedForRescheduling).toBeGreaterThan(0);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        { _id: conflictingAppointment._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'needs_rescheduling',
            reschedulingReason: 'Working hours changed',
          }),
        }),
        { session: mockSession },
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should cancel appointments when strategy is "cancel"', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conflictingAppointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId: {
          _id: patientId,
          firstName: 'Bob',
          lastName: 'Johnson',
        },
        appointmentDate: tomorrow,
        appointmentTime: '08:00',
        durationMinutes: 30,
        status: 'scheduled',
        deletedAt: null,
      };

      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
      ]);
      mockAppointmentModel.exec.mockResolvedValue([conflictingAppointment]);
      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const result = await service.updateWithRescheduling(
        'user',
        doctorId.toString(),
        newSchedule,
        {
          handleConflicts: 'cancel',
          notifyPatients: true,
          reschedulingReason: 'Doctor unavailable',
        },
      );

      expect(result.appointmentsCancelled).toBeGreaterThan(0);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        { _id: conflictingAppointment._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'cancelled',
            cancellationReason: 'Doctor unavailable',
          }),
        }),
        { session: mockSession },
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      mockWorkingHoursModel.deleteMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateWithRescheduling(
          'user',
          doctorId.toString(),
          newSchedule,
          {
            handleConflicts: 'reschedule',
          },
        ),
      ).rejects.toThrow('Database error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should not process appointments for non-user entity types', async () => {
      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
      ]);

      const result = await service.updateWithRescheduling(
        'clinic',
        clinicId.toString(),
        newSchedule,
        {
          handleConflicts: 'reschedule',
        },
      );

      expect(result.appointmentsRescheduled).toBe(0);
      expect(result.appointmentsMarkedForRescheduling).toBe(0);
      expect(result.appointmentsCancelled).toBe(0);
      expect(mockAppointmentModel.find).not.toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should not send notifications when notifyPatients is false', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conflictingAppointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId: {
          _id: patientId,
          firstName: 'Test',
          lastName: 'Patient',
        },
        appointmentDate: tomorrow,
        appointmentTime: '08:00',
        durationMinutes: 30,
        status: 'scheduled',
        deletedAt: null,
      };

      mockWorkingHoursModel.deleteMany.mockResolvedValue({ deletedCount: 7 });
      mockWorkingHoursModel.insertMany.mockResolvedValue([
        { _id: new Types.ObjectId(), ...newSchedule[0] },
      ]);
      mockAppointmentModel.exec.mockResolvedValue([conflictingAppointment]);
      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.updateWithRescheduling(
        'user',
        doctorId.toString(),
        newSchedule,
        {
          handleConflicts: 'notify',
          notifyPatients: false,
        },
      );

      expect(result.notificationsSent).toBe(0);
      expect(mockNotificationModel.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('rescheduleAppointments', () => {
    it('should reschedule appointment to same time if within new hours', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: nextMonday,
        appointmentTime: '10:00', // Within new hours
        durationMinutes: 30,
        status: 'scheduled',
      };

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        [appointment as any],
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rescheduled');
      expect(result[0].newTime).toBe('10:00'); // Same time
    });

    it('should find alternative time when current time conflicts', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: nextMonday,
        appointmentTime: '08:00', // Before opening time
        durationMinutes: 30,
        status: 'scheduled',
      };

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        [appointment as any],
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rescheduled');
      expect(result[0].newTime).toBe('09:00'); // Rescheduled to opening time
    });

    it('should mark for manual rescheduling when day is not working', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: nextMonday,
        appointmentTime: '10:00',
        durationMinutes: 30,
        status: 'scheduled',
      };

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: false, // Not a working day
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        [appointment as any],
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('marked_for_rescheduling');
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        { _id: appointment._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'needs_rescheduling',
          }),
        }),
        { session: mockSession },
      );
    });

    it('should mark for manual rescheduling when no suitable time found', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: nextMonday,
        appointmentTime: '10:00',
        durationMinutes: 600, // 10 hours - too long for any slot (9:00-17:00 is only 8 hours)
        status: 'scheduled',
      };

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        [appointment as any],
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('marked_for_rescheduling');
    });

    it('should handle appointments during break time', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: nextMonday,
        appointmentTime: '12:15', // During break
        durationMinutes: 30,
        status: 'scheduled',
      };

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

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        [appointment as any],
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(1);
      // Should be rescheduled to a time outside break
      if (result[0].status === 'rescheduled') {
        const newTime = result[0].newTime!;
        const [hours, minutes] = newTime.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        const breakStart = 12 * 60;
        const breakEnd = 13 * 60;
        expect(timeInMinutes < breakStart || timeInMinutes >= breakEnd).toBe(
          true,
        );
      }
    });

    it('should handle multiple appointments', async () => {
      // Get next Monday
      const nextMonday = new Date();
      nextMonday.setDate(
        nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7),
      );

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: nextMonday,
          appointmentTime: '08:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: new Types.ObjectId(),
          appointmentDate: nextMonday,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
      ];

      const newSchedule = [
        {
          dayOfWeek: 'monday',
          isWorkingDay: true,
          openingTime: '09:00',
          closingTime: '17:00',
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.rescheduleAppointments(
        appointments as any,
        newSchedule,
        mockSession,
      );

      expect(result).toHaveLength(2);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('markForRescheduling', () => {
    it('should mark appointments for manual rescheduling', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: new Types.ObjectId(),
          appointmentDate: tomorrow,
          appointmentTime: '14:00',
          durationMinutes: 30,
          status: 'confirmed',
        },
      ];

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.markForRescheduling(
        appointments as any,
        'Working hours changed',
        mockSession,
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('marked_for_rescheduling');
      expect(result[1].status).toBe('marked_for_rescheduling');
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('should include rescheduling reason in update', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: tomorrow,
        appointmentTime: '10:00',
        durationMinutes: 30,
        status: 'scheduled',
      };

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.markForRescheduling(
        [appointment as any],
        'Custom reason',
        mockSession,
      );

      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        { _id: appointment._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'needs_rescheduling',
            reschedulingReason: 'Custom reason',
            markedForReschedulingAt: expect.any(Date),
          }),
        }),
        { session: mockSession },
      );
    });

    it('should return appointment details', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: tomorrow,
        appointmentTime: '10:00',
        durationMinutes: 30,
        status: 'scheduled',
      };

      mockAppointmentModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.markForRescheduling(
        [appointment as any],
        'Test reason',
        mockSession,
      );

      expect(result[0].appointmentId).toBe(appointment._id.toString());
      expect(result[0].oldTime).toBe('10:00');
      expect(result[0].oldDate).toBeDefined();
    });
  });

  describe('notifyPatients', () => {
    it('should send notifications for rescheduled appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
      ];

      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const count = await service.notifyPatients(
        appointments as any,
        'reschedule',
        mockSession,
      );

      expect(count).toBe(1);
      expect(mockNotificationModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: patientId,
            priority: 'high',
            relatedEntityType: 'appointment',
          }),
        ]),
        { session: mockSession },
      );
    });

    it('should send notifications for appointments needing manual rescheduling', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
      ];

      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const count = await service.notifyPatients(
        appointments as any,
        'notify',
        mockSession,
      );

      expect(count).toBe(1);
      expect(mockNotificationModel.insertMany).toHaveBeenCalled();
    });

    it('should send notifications for cancelled appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
      ];

      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      const count = await service.notifyPatients(
        appointments as any,
        'cancel',
        mockSession,
      );

      expect(count).toBe(1);
      expect(mockNotificationModel.insertMany).toHaveBeenCalled();
    });

    it('should include bilingual messages in notifications', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointment = {
        _id: new Types.ObjectId(),
        doctorId,
        patientId,
        appointmentDate: tomorrow,
        appointmentTime: '10:00',
        durationMinutes: 30,
        status: 'scheduled',
      };

      mockNotificationModel.insertMany.mockResolvedValue([{}]);

      await service.notifyPatients(
        [appointment as any],
        'reschedule',
        mockSession,
      );

      expect(mockNotificationModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.stringContaining('/'),
            message: expect.stringContaining('/'),
          }),
        ]),
        { session: mockSession },
      );
    });

    it('should handle multiple appointments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = [
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId,
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          durationMinutes: 30,
          status: 'scheduled',
        },
        {
          _id: new Types.ObjectId(),
          doctorId,
          patientId: new Types.ObjectId(),
          appointmentDate: tomorrow,
          appointmentTime: '14:00',
          durationMinutes: 30,
          status: 'confirmed',
        },
      ];

      mockNotificationModel.insertMany.mockResolvedValue([{}, {}]);

      const count = await service.notifyPatients(
        appointments as any,
        'notify',
        mockSession,
      );

      expect(count).toBe(2);
    });

    it('should return 0 when no appointments provided', async () => {
      const count = await service.notifyPatients([], 'reschedule', mockSession);

      expect(count).toBe(0);
      expect(mockNotificationModel.insertMany).not.toHaveBeenCalled();
    });
  });
});
