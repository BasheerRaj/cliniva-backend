import { BilingualMessage } from '../types/response.types';
import { AuthErrorCode } from '../enums/auth-error-code.enum';

/**
 * Bilingual error messages for authentication errors
 * Supports both Arabic (ar) and English (en)
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, BilingualMessage> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    ar: 'بيانات الاعتماد غير صحيحة',
    en: 'Invalid credentials',
  },
  [AuthErrorCode.TOKEN_EXPIRED]: {
    ar: 'انتهت صلاحية الرمز',
    en: 'Token expired',
  },
  [AuthErrorCode.TOKEN_INVALID]: {
    ar: 'رمز غير صالح',
    en: 'Invalid token',
  },
  [AuthErrorCode.USER_NOT_FOUND]: {
    ar: 'المستخدم غير موجود',
    en: 'User not found',
  },
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: {
    ar: 'البريد الإلكتروني غير مؤكد',
    en: 'Email not verified',
  },
  [AuthErrorCode.ACCOUNT_DEACTIVATED]: {
    ar: 'الحساب معطل',
    en: 'Account deactivated',
  },
  [AuthErrorCode.PASSWORD_RESET_TOKEN_INVALID]: {
    ar: 'رمز إعادة تعيين كلمة المرور غير صالح',
    en: 'Password reset token invalid',
  },
  [AuthErrorCode.PASSWORD_RESET_TOKEN_EXPIRED]: {
    ar: 'انتهت صلاحية رمز إعادة تعيين كلمة المرور',
    en: 'Password reset token expired',
  },
  [AuthErrorCode.PASSWORD_CHANGE_REQUIRED]: {
    ar: 'يجب تغيير كلمة المرور',
    en: 'Password change required',
  },
  [AuthErrorCode.NEW_PASSWORD_SAME_AS_CURRENT]: {
    ar: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
    en: 'New password must differ from current password',
  },
  [AuthErrorCode.RATE_LIMIT_EXCEEDED]: {
    ar: 'تم تجاوز الحد المسموح من المحاولات',
    en: 'Rate limit exceeded',
  },
  [AuthErrorCode.TOKEN_BLACKLISTED]: {
    ar: 'الرمز محظور',
    en: 'Token blacklisted',
  },
  [AuthErrorCode.PASSWORDS_DO_NOT_MATCH]: {
    ar: 'كلمات المرور غير متطابقة',
    en: 'Passwords do not match',
  },
  [AuthErrorCode.WEAK_PASSWORD]: {
    ar: 'كلمة المرور ضعيفة جداً',
    en: 'Password too weak',
  },
};

/**
 * Success messages for authentication operations
 */
export const AUTH_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: {
    ar: 'تم تسجيل الدخول بنجاح',
    en: 'Login successful',
  },
  LOGOUT_SUCCESS: {
    ar: 'تم تسجيل الخروج بنجاح',
    en: 'Logout successful',
  },
  PASSWORD_CHANGED: {
    ar: 'تم تغيير كلمة المرور بنجاح',
    en: 'Password changed successfully',
  },
  PASSWORD_RESET_EMAIL_SENT: {
    ar: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
    en: 'Password reset link sent to your email',
  },
  PASSWORD_RESET_SUCCESS: {
    ar: 'تم إعادة تعيين كلمة المرور بنجاح',
    en: 'Password reset successful',
  },
  TOKEN_REFRESHED: {
    ar: 'تم تحديث الرمز بنجاح',
    en: 'Token refreshed successfully',
  },
  FIRST_LOGIN_PASSWORD_CHANGED: {
    ar: 'تم تغيير كلمة المرور الأولية بنجاح',
    en: 'Initial password changed successfully',
  },
} as const;
