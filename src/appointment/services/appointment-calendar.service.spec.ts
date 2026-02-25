import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentCalendarService } from './appointment-calendar.service';
import { Appointment } from '../../database/schemas/appointment.schema';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CalendarView } from '../constants/calendar-view.enum';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { BadRequestException } from '@nestjs/common';

describe('AppointmentCalendarService', () => {
  let service: AppointmentCalendarService;
  let appointmentModel: Model<Appointment>;

  const mockAppointmentModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentCalendarService,
        {
          provide: getModelToken('Appointment'),
          useValue: mockAppointmentModel,
        },
      ],
    }).compile();

    service = module.get<AppointmentCalendarService>(
      AppointmentCalendarService,
    );
    appointmentModel = module.get<Model<Appointment>>(
      getModelToken('Appointment'),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCalendarView', () => {
    it('should route to getDayView when view is day', async () => {
      const query: CalendarQueryDto = {
        view: CalendarView.DAY,
        date: new Date('2024-03-15'),
      };

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getCalendarView(query);

      expect(result.view).toBe(CalendarView.DAY);
      expect(result.dateRange).toBeDefined();
      expect(result.appointments).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should route to getWeekView when view is week', async () => {
      const query: CalendarQueryDto = {
        view: CalendarView.WEEK,
        date: new Date('2024-03-15'),
      };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getCalendarView(query);

      expect(result.view).toBe(CalendarView.WEEK);
      expect(result.dateRange).toBeDefined();
    });

    it('should route to getMonthView when view is month', async () => {
      const query: CalendarQueryDto = {
        view: CalendarView.MONTH,
        date: new Date('2024-03-15'),
      };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getCalendarView(query);

      expect(result.view).toBe(CalendarView.MONTH);
      expect(result.dateRange).toBeDefined();
    });

    it('should default to week view when view is not specified', async () => {
      const query: CalendarQueryDto = {};

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getCalendarView(query);

      expect(result.view).toBe(CalendarView.WEEK);
    });

    it('should use current date when date is not specified', async () => {
      const query: CalendarQueryDto = {
        view: CalendarView.DAY,
      };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getCalendarView(query);

      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.start).toBeInstanceOf(Date);
      expect(result.dateRange.end).toBeInstanceOf(Date);
    });
  });

  describe('getDayView', () => {
    it('should return appointments for a specific day', async () => {
      const date = new Date('2024-03-15');
      const query: CalendarQueryDto = {};

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getDayView(date, query);

      expect(result.view).toBe(CalendarView.DAY);
      expect(result.dateRange.start.getDate()).toBe(15);
      expect(result.dateRange.end.getDate()).toBe(15);
      expect(result.appointments['2024-03-15']).toBeDefined();
      expect(result.appointments['2024-03-15'].length).toBe(1);
      expect(result.summary.totalAppointments).toBe(1);
    });

    it('should filter by clinic when clinicId is provided', async () => {
      const date = new Date('2024-03-15');
      const clinicId = new Types.ObjectId().toString();
      const query: CalendarQueryDto = { clinicId };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getDayView(date, query);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should filter by doctor when doctorId is provided', async () => {
      const date = new Date('2024-03-15');
      const doctorId = new Types.ObjectId().toString();
      const query: CalendarQueryDto = { doctorId };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getDayView(date, query);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should filter by department when departmentId is provided', async () => {
      const date = new Date('2024-03-15');
      const departmentId = new Types.ObjectId().toString();
      const query: CalendarQueryDto = { departmentId };

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getDayView(date, query);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should exclude soft-deleted appointments', async () => {
      const date = new Date('2024-03-15');
      const query: CalendarQueryDto = {};

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getDayView(date, query);

      expect(mockAppointmentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: { $exists: false },
        }),
      );
    });
  });

  describe('getWeekView', () => {
    it('should return appointments for a 7-day week', async () => {
      const date = new Date('2024-03-15'); // Friday
      const query: CalendarQueryDto = {};

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-10'), // Sunday
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'), // Friday
          appointmentTime: '14:00',
          status: 'confirmed',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'Jane', lastName: 'Smith', phone: '456', email: 'jane@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Jones', email: 'jones@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Follow-up', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getWeekView(date, query);

      expect(result.view).toBe(CalendarView.WEEK);
      expect(result.dateRange.start.getDay()).toBe(0); // Sunday
      expect(result.dateRange.end.getDay()).toBe(6); // Saturday
      expect(result.appointments['2024-03-10']).toBeDefined();
      expect(result.appointments['2024-03-15']).toBeDefined();
      expect(result.summary.totalAppointments).toBe(2);
    });

    it('should calculate correct week range', async () => {
      const date = new Date('2024-03-15'); // Friday
      const query: CalendarQueryDto = {};

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getWeekView(date, query);

      // Week should start on Sunday (March 10) and end on Saturday (March 16)
      expect(result.dateRange.start.getDate()).toBe(10);
      expect(result.dateRange.end.getDate()).toBe(16);
    });
  });

  describe('getMonthView', () => {
    it('should return appointments for entire month', async () => {
      const date = new Date('2024-03-15');
      const query: CalendarQueryDto = {};

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-01'),
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-31'),
          appointmentTime: '14:00',
          status: 'completed',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'Jane', lastName: 'Smith', phone: '456', email: 'jane@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Jones', email: 'jones@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Follow-up', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getMonthView(date, query);

      expect(result.view).toBe(CalendarView.MONTH);
      expect(result.dateRange.start.getDate()).toBe(1);
      expect(result.dateRange.end.getDate()).toBe(31);
      expect(result.appointments['2024-03-01']).toBeDefined();
      expect(result.appointments['2024-03-31']).toBeDefined();
      expect(result.summary.totalAppointments).toBe(2);
    });

    it('should handle months with different number of days', async () => {
      const februaryDate = new Date('2024-02-15'); // Leap year
      const query: CalendarQueryDto = {};

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMonthView(februaryDate, query);

      expect(result.dateRange.start.getDate()).toBe(1);
      expect(result.dateRange.end.getDate()).toBe(29); // Leap year
    });
  });

  describe('summary calculations', () => {
    it('should calculate correct status counts', async () => {
      const date = new Date('2024-03-15');
      const query: CalendarQueryDto = {};

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '11:00',
          status: 'confirmed',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'Jane', lastName: 'Smith', phone: '456', email: 'jane@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Jones', email: 'jones@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Follow-up', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '14:00',
          status: 'completed',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'Bob', lastName: 'Johnson', phone: '789', email: 'bob@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Brown', email: 'brown@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Checkup', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getDayView(date, query);

      expect(result.summary.totalAppointments).toBe(3);
      expect(result.summary.byStatus.scheduled).toBe(1);
      expect(result.summary.byStatus.confirmed).toBe(1);
      expect(result.summary.byStatus.completed).toBe(1);
      expect(result.summary.byStatus.cancelled).toBe(0);
    });
  });

  describe('appointment grouping', () => {
    it('should group appointments by date correctly', async () => {
      const date = new Date('2024-03-15');
      const query: CalendarQueryDto = {};

      const mockAppointments = [
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '10:00',
          status: 'scheduled',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'John', lastName: 'Doe', phone: '123', email: 'john@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Smith', email: 'dr@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Consultation', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          appointmentDate: new Date('2024-03-15'),
          appointmentTime: '14:00',
          status: 'confirmed',
          duration: 30,
          patientId: { _id: new Types.ObjectId(), firstName: 'Jane', lastName: 'Smith', phone: '456', email: 'jane@example.com' },
          doctorId: { _id: new Types.ObjectId(), firstName: 'Dr', lastName: 'Jones', email: 'jones@example.com' },
          clinicId: { _id: new Types.ObjectId(), name: 'Main Clinic', address: '123 St' },
          serviceId: { _id: new Types.ObjectId(), name: 'Follow-up', durationMinutes: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAppointmentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAppointments),
      });

      const result = await service.getDayView(date, query);

      expect(result.appointments['2024-03-15']).toBeDefined();
      expect(result.appointments['2024-03-15'].length).toBe(2);
      expect(result.appointments['2024-03-15'][0].appointmentTime).toBe('10:00');
      expect(result.appointments['2024-03-15'][1].appointmentTime).toBe('14:00');
    });
  });
});
