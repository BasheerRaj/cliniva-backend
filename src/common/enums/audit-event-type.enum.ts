export enum AuditEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  SESSION_INVALIDATION = 'session_invalidation',
  RATE_LIMIT_VIOLATION = 'rate_limit_violation',
  EMAIL_CHANGE = 'email_change',
  ROLE_CHANGE = 'role_change',
  TOKEN_REFRESH = 'token_refresh',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  // User Management Events
  USER_STATUS_CHANGE = 'user_status_change',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  // Employee Management Events
  EMPLOYEE_CREATED = 'employee_created',
  EMPLOYEE_UPDATED = 'employee_updated',
  EMPLOYEE_DELETED = 'employee_deleted',
  EMPLOYEE_TERMINATED = 'employee_terminated',
  // Doctor Management Events
  DOCTOR_DEACTIVATED = 'doctor_deactivated',
  APPOINTMENTS_TRANSFERRED = 'appointments_transferred',
  APPOINTMENTS_RESCHEDULED = 'appointments_rescheduled',
  // Clinic Management Events
  CLINIC_STATUS_CHANGED = 'clinic_status_changed',
  CLINIC_STAFF_TRANSFERRED = 'clinic_staff_transferred',
}
