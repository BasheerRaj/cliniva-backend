/**
 * Appointment DTOs Index
 * Exports all DTOs for the Appointments Management Module (M6)
 */

// Core DTOs
export * from './create-appointment.dto';
export * from './update-appointment.dto';

// Filter and Query DTOs
export * from './appointment-filter.dto';
export * from './calendar-query.dto';
export * from './availability-query.dto';

// Status Management DTOs
export * from './status-update.dto';
export * from './complete-appointment.dto';
export * from './cancel-appointment.dto';
export * from './reschedule.dto';

// Response DTOs
export * from './responses/appointment-response.dto';
export * from './responses/appointment-list-response.dto';
export * from './responses/calendar-response.dto';
export * from './responses/availability-response.dto';

// Additional DTOs (missing types referenced in service/controller)
export * from './missing-appointment-dtos';
