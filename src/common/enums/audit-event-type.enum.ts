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
}
