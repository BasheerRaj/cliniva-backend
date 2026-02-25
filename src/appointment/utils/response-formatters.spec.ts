/**
 * Response Formatters Tests
 *
 * Unit tests for response formatting utilities.
 *
 * @module appointment/utils/response-formatters.spec
 */

import {
  formatAppointmentResponse,
  formatAppointmentListResponse,
  formatCalendarResponse,
  formatAvailabilityResponse,
  formatErrorResponse,
  createPaginationMeta,
} from './response-formatters';
import { AppointmentDataDto } from '../dto/responses/appointment-response.dto';
import { CalendarData } from '../dto/responses/calendar-response.dto';
import { AppointmentStatus } from '../constants/appointment-status.enum';
import { CalendarView } from '../constants/calendar-view.enum';

describe('Response Formatters', () => {
  const mockAppointment: AppointmentDataDto = {
    id: '507f1f77bcf86cd799439016',
    patient: {
      id: '507f1f77bcf86cd799439011',
      name: 'Ahmed Hassan',
      contactNumber: '+966501234567',
    },
    doctor: {
      id: '507f1f77bcf86cd799439012',
      name: 'Dr. Fatima Al-Rashid',
      specialty: 'Cardiology',
    },
    service: {
      id: '507f1f77bcf86cd799439013',
      name: 'General Consultation',
      duration: 30,
    },
    clinic: {
      id: '507f1f77bcf86cd799439014',
      name: 'Main Clinic',
    },
    appointmentDate: new Date('2024-03-15'),
    appointmentTime: '14:30',
    duration: 30,
    status: AppointmentStatus.SCHEDULED,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  };

  const mockMessage = {
    ar: 'تم إنشاء الموعد بنجاح',
    en: 'Appointment created successfully',
  };

  describe('formatAppointmentResponse', () => {
    it('should format single appointment response correctly', () => {
      const result = formatAppointmentResponse(mockAppointment, mockMessage);

      expect(result).toEqual({
        success: true,
        data: mockAppointment,
        message: mockMessage,
      });
    });

    it('should include success flag as true', () => {
      const result = formatAppointmentResponse(mockAppointment, mockMessage);
      expect(result.success).toBe(true);
    });

    it('should include bilingual message', () => {
      const result = formatAppointmentResponse(mockAppointment, mockMessage);
      expect(result.message).toHaveProperty('ar');
      expect(result.message).toHaveProperty('en');
    });

    it('should preserve appointment data structure', () => {
      const result = formatAppointmentResponse(mockAppointment, mockMessage);
      expect(result.data).toEqual(mockAppointment);
      expect(result.data.id).toBe(mockAppointment.id);
      expect(result.data.patient.name).toBe(mockAppointment.patient.name);
    });
  });

  describe('formatAppointmentListResponse', () => {
    const mockAppointments = [mockAppointment];

    it('should format appointment list response correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        150,
        mockMessage,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('message');
    });

    it('should calculate pagination metadata correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        150,
        mockMessage,
      );

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
        hasPrevious: false,
        hasNext: true,
      });
    });

    it('should handle first page correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        150,
        mockMessage,
      );

      expect(result.meta.hasPrevious).toBe(false);
      expect(result.meta.hasNext).toBe(true);
    });

    it('should handle last page correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        8,
        20,
        150,
        mockMessage,
      );

      expect(result.meta.hasPrevious).toBe(true);
      expect(result.meta.hasNext).toBe(false);
    });

    it('should handle middle page correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        4,
        20,
        150,
        mockMessage,
      );

      expect(result.meta.hasPrevious).toBe(true);
      expect(result.meta.hasNext).toBe(true);
    });

    it('should handle single page correctly', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        15,
        mockMessage,
      );

      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasPrevious).toBe(false);
      expect(result.meta.hasNext).toBe(false);
    });

    it('should include appointments array', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        150,
        mockMessage,
      );

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual(mockAppointments);
    });

    it('should include bilingual message', () => {
      const result = formatAppointmentListResponse(
        mockAppointments,
        1,
        20,
        150,
        mockMessage,
      );

      expect(result.message).toEqual(mockMessage);
    });
  });

  describe('formatCalendarResponse', () => {
    const mockCalendarData: CalendarData = {
      view: CalendarView.WEEK,
      dateRange: {
        start: new Date('2024-03-10'),
        end: new Date('2024-03-16'),
      },
      appointments: {
        '2024-03-15': [mockAppointment],
      },
      summary: {
        totalAppointments: 1,
        byStatus: {
          scheduled: 1,
          confirmed: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
          no_show: 0,
        },
      },
    };

    it('should format calendar response correctly', () => {
      const result = formatCalendarResponse(mockCalendarData, mockMessage);

      expect(result).toEqual({
        success: true,
        data: mockCalendarData,
        message: mockMessage,
      });
    });

    it('should include success flag as true', () => {
      const result = formatCalendarResponse(mockCalendarData, mockMessage);
      expect(result.success).toBe(true);
    });

    it('should preserve calendar data structure', () => {
      const result = formatCalendarResponse(mockCalendarData, mockMessage);
      expect(result.data.view).toBe(CalendarView.WEEK);
      expect(result.data.appointments).toHaveProperty('2024-03-15');
    });

    it('should include bilingual message', () => {
      const result = formatCalendarResponse(mockCalendarData, mockMessage);
      expect(result.message).toEqual(mockMessage);
    });
  });

  describe('formatAvailabilityResponse', () => {
    const mockAvailabilityData = {
      date: '2024-03-15',
      slots: [
        { startTime: '09:00', endTime: '09:30', available: true },
        { startTime: '09:30', endTime: '10:00', available: true },
      ],
    };

    it('should format availability response correctly', () => {
      const result = formatAvailabilityResponse(
        mockAvailabilityData,
        mockMessage,
      );

      expect(result).toEqual({
        success: true,
        data: mockAvailabilityData,
        message: mockMessage,
      });
    });

    it('should include success flag as true', () => {
      const result = formatAvailabilityResponse(
        mockAvailabilityData,
        mockMessage,
      );
      expect(result.success).toBe(true);
    });

    it('should preserve availability data structure', () => {
      const result = formatAvailabilityResponse(
        mockAvailabilityData,
        mockMessage,
      );
      expect(result.data).toEqual(mockAvailabilityData);
      expect(result.data.slots).toHaveLength(2);
    });

    it('should work with different data types', () => {
      const customData = { customField: 'value', count: 5 };
      const result = formatAvailabilityResponse(customData, mockMessage);

      expect(result.data).toEqual(customData);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error response correctly', () => {
      const result = formatErrorResponse('APPOINTMENT_NOT_FOUND', {
        ar: 'الموعد غير موجود',
        en: 'Appointment not found',
      });

      expect(result).toEqual({
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: {
            ar: 'الموعد غير موجود',
            en: 'Appointment not found',
          },
        },
      });
    });

    it('should include success flag as false', () => {
      const result = formatErrorResponse('ERROR_CODE', mockMessage);
      expect(result.success).toBe(false);
    });

    it('should include error code', () => {
      const result = formatErrorResponse('CUSTOM_ERROR', mockMessage);
      expect(result.error.code).toBe('CUSTOM_ERROR');
    });

    it('should include bilingual error message', () => {
      const result = formatErrorResponse('ERROR_CODE', mockMessage);
      expect(result.error.message).toEqual(mockMessage);
    });

    it('should include optional details', () => {
      const details = { appointmentId: '123', reason: 'Not found' };
      const result = formatErrorResponse('ERROR_CODE', mockMessage, details);

      expect(result.error.details).toEqual(details);
    });

    it('should work without details', () => {
      const result = formatErrorResponse('ERROR_CODE', mockMessage);
      expect(result.error.details).toBeUndefined();
    });
  });

  describe('createPaginationMeta', () => {
    it('should create pagination metadata correctly', () => {
      const result = createPaginationMeta(1, 20, 150);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
        hasPrevious: false,
        hasNext: true,
      });
    });

    it('should calculate total pages correctly', () => {
      expect(createPaginationMeta(1, 20, 150).totalPages).toBe(8);
      expect(createPaginationMeta(1, 20, 100).totalPages).toBe(5);
      expect(createPaginationMeta(1, 20, 15).totalPages).toBe(1);
    });

    it('should handle exact division', () => {
      const result = createPaginationMeta(1, 20, 100);
      expect(result.totalPages).toBe(5);
    });

    it('should handle remainder in division', () => {
      const result = createPaginationMeta(1, 20, 105);
      expect(result.totalPages).toBe(6);
    });

    it('should set hasPrevious correctly', () => {
      expect(createPaginationMeta(1, 20, 150).hasPrevious).toBe(false);
      expect(createPaginationMeta(2, 20, 150).hasPrevious).toBe(true);
      expect(createPaginationMeta(8, 20, 150).hasPrevious).toBe(true);
    });

    it('should set hasNext correctly', () => {
      expect(createPaginationMeta(1, 20, 150).hasNext).toBe(true);
      expect(createPaginationMeta(7, 20, 150).hasNext).toBe(true);
      expect(createPaginationMeta(8, 20, 150).hasNext).toBe(false);
    });

    it('should handle single page', () => {
      const result = createPaginationMeta(1, 20, 15);
      expect(result.totalPages).toBe(1);
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
    });

    it('should handle empty results', () => {
      const result = createPaginationMeta(1, 20, 0);
      expect(result.totalPages).toBe(0);
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
    });
  });
});
