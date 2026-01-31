/**
 * Bilingual message interface for Arabic and English support
 */
export interface BilingualMessage {
  ar: string;
  en: string;
}

/**
 * Base success response structure
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message: BilingualMessage;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Base error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: BilingualMessage;
    details?: any;
  };
}

/**
 * Authentication response with tokens and user data
 */
export interface AuthResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isFirstLogin: boolean;
      passwordChangeRequired: boolean;
      preferredLanguage?: 'ar' | 'en';
      setupComplete?: boolean;
      subscriptionId?: string | null;
      organizationId?: string | null;
      complexId?: string | null;
      clinicId?: string | null;
      onboardingComplete?: boolean;
      onboardingProgress?: string[];
      planType?: string | null;
      isOwner: boolean;
    };
  };
  message: BilingualMessage;
}

/**
 * Token response for refresh operations
 */
export interface TokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
  };
  message: BilingualMessage;
}
