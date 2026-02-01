import { ResponseBuilder } from './response-builder.util';
import { BilingualMessage, ApiResponse, PaginatedResponse } from '../types/bilingual-message.type';

describe('ResponseBuilder', () => {
  // ============================================================================
  // success() Tests
  // ============================================================================
  describe('success', () => {
    it('should build success response with data and message', () => {
      const data = { id: '123', name: 'Test User' };
      const message: BilingualMessage = {
        ar: 'تم إنشاء المستخدم بنجاح',
        en: 'User created successfully'
      };

      const response = ResponseBuilder.success(data, message);

      expect(response).toEqual({
        success: true,
        data,
        message
      });
    });

    it('should build success response with data only (no message)', () => {
      const data = { id: '123', name: 'Test User' };

      const response = ResponseBuilder.success(data);

      expect(response).toEqual({
        success: true,
        data
      });
      expect(response.message).toBeUndefined();
    });

    it('should handle null data', () => {
      const response = ResponseBuilder.success(null);

      expect(response).toEqual({
        success: true,
        data: null
      });
    });

    it('should handle undefined data', () => {
      const response = ResponseBuilder.success(undefined);

      expect(response).toEqual({
        success: true,
        data: undefined
      });
    });

    it('should handle array data', () => {
      const data = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ];

      const response = ResponseBuilder.success(data);

      expect(response).toEqual({
        success: true,
        data
      });
    });

    it('should handle primitive data types', () => {
      const stringResponse = ResponseBuilder.success('test string');
      expect(stringResponse.data).toBe('test string');

      const numberResponse = ResponseBuilder.success(42);
      expect(numberResponse.data).toBe(42);

      const booleanResponse = ResponseBuilder.success(true);
      expect(booleanResponse.data).toBe(true);
    });

    it('should always set success to true', () => {
      const response1 = ResponseBuilder.success({ test: 'data' });
      const response2 = ResponseBuilder.success(null);
      const response3 = ResponseBuilder.success([]);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response3.success).toBe(true);
    });

    it('should preserve data structure', () => {
      const complexData = {
        user: {
          id: '123',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            contacts: ['email@test.com', 'phone']
          }
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const response = ResponseBuilder.success(complexData);

      expect(response.data).toEqual(complexData);
    });
  });

  // ============================================================================
  // paginated() Tests
  // ============================================================================
  describe('paginated', () => {
    it('should build paginated response with all metadata', () => {
      const data = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ];
      const page = 1;
      const limit = 10;
      const total = 25;

      const response = ResponseBuilder.paginated(data, page, limit, total);

      expect(response).toEqual({
        success: true,
        data,
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('should calculate totalPages correctly', () => {
      // Test various scenarios
      const scenarios = [
        { total: 25, limit: 10, expectedPages: 3 },
        { total: 30, limit: 10, expectedPages: 3 },
        { total: 31, limit: 10, expectedPages: 4 },
        { total: 100, limit: 20, expectedPages: 5 },
        { total: 1, limit: 10, expectedPages: 1 },
        { total: 0, limit: 10, expectedPages: 0 }
      ];

      scenarios.forEach(({ total, limit, expectedPages }) => {
        const response = ResponseBuilder.paginated([], 1, limit, total);
        expect(response.meta?.totalPages).toBe(expectedPages);
      });
    });

    it('should include optional message', () => {
      const data = [{ id: '1' }];
      const message: BilingualMessage = {
        ar: 'تم جلب البيانات بنجاح',
        en: 'Data fetched successfully'
      };

      const response = ResponseBuilder.paginated(data, 1, 10, 1, message);

      expect(response.message).toEqual(message);
    });

    it('should work with empty data array', () => {
      const response = ResponseBuilder.paginated([], 1, 10, 0);

      expect(response).toEqual({
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should handle different page numbers', () => {
      const data = [{ id: '1' }];

      const page1 = ResponseBuilder.paginated(data, 1, 10, 100);
      expect(page1.meta?.page).toBe(1);

      const page5 = ResponseBuilder.paginated(data, 5, 10, 100);
      expect(page5.meta?.page).toBe(5);

      const page10 = ResponseBuilder.paginated(data, 10, 10, 100);
      expect(page10.meta?.page).toBe(10);
    });

    it('should handle different limit values', () => {
      const data = [{ id: '1' }];

      const limit10 = ResponseBuilder.paginated(data, 1, 10, 100);
      expect(limit10.meta?.limit).toBe(10);
      expect(limit10.meta?.totalPages).toBe(10);

      const limit20 = ResponseBuilder.paginated(data, 1, 20, 100);
      expect(limit20.meta?.limit).toBe(20);
      expect(limit20.meta?.totalPages).toBe(5);

      const limit50 = ResponseBuilder.paginated(data, 1, 50, 100);
      expect(limit50.meta?.limit).toBe(50);
      expect(limit50.meta?.totalPages).toBe(2);
    });

    it('should always set success to true', () => {
      const response = ResponseBuilder.paginated([], 1, 10, 0);
      expect(response.success).toBe(true);
    });

    it('should preserve data array structure', () => {
      const complexData = [
        {
          id: '1',
          user: { name: 'User 1' },
          metadata: { createdAt: new Date() }
        },
        {
          id: '2',
          user: { name: 'User 2' },
          metadata: { createdAt: new Date() }
        }
      ];

      const response = ResponseBuilder.paginated(complexData, 1, 10, 2);

      expect(response.data).toEqual(complexData);
    });

    it('should handle edge case: total less than limit', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = ResponseBuilder.paginated(data, 1, 10, 2);

      expect(response.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should handle edge case: exact multiple of limit', () => {
      const data = [{ id: '1' }];
      const response = ResponseBuilder.paginated(data, 1, 10, 100);

      expect(response.meta?.totalPages).toBe(10);
    });
  });

  // ============================================================================
  // error() Tests
  // ============================================================================
  describe('error', () => {
    it('should build error response with code and message', () => {
      const code = 'USER_NOT_FOUND';
      const message: BilingualMessage = {
        ar: 'المستخدم غير موجود',
        en: 'User not found'
      };

      const response = ResponseBuilder.error(code, message);

      expect(response).toEqual({
        success: false,
        error: {
          code,
          message
        }
      });
    });

    it('should include optional details', () => {
      const code = 'VALIDATION_ERROR';
      const message: BilingualMessage = {
        ar: 'خطأ في التحقق',
        en: 'Validation error'
      };
      const details = {
        field: 'email',
        reason: 'Invalid format'
      };

      const response = ResponseBuilder.error(code, message, details);

      expect(response).toEqual({
        success: false,
        error: {
          code,
          message,
          details
        }
      });
    });

    it('should not include details when null', () => {
      const code = 'ERROR_CODE';
      const message: BilingualMessage = { ar: 'خطأ', en: 'Error' };

      const response = ResponseBuilder.error(code, message, null);

      // Details should not be included when null (due to spread operator)
      expect(response.error?.details).toBeUndefined();
      expect(response.error).not.toHaveProperty('details');
    });

    it('should not include details when undefined', () => {
      const code = 'ERROR_CODE';
      const message: BilingualMessage = { ar: 'خطأ', en: 'Error' };

      const response = ResponseBuilder.error(code, message, undefined);

      // Details should not be included when undefined (due to spread operator)
      expect(response.error?.details).toBeUndefined();
      expect(response.error).not.toHaveProperty('details');
    });

    it('should always set success to false', () => {
      const response1 = ResponseBuilder.error('CODE1', { ar: 'خطأ', en: 'Error' });
      const response2 = ResponseBuilder.error('CODE2', { ar: 'خطأ', en: 'Error' }, {});
      const response3 = ResponseBuilder.error('CODE3', { ar: 'خطأ', en: 'Error' }, null);

      expect(response1.success).toBe(false);
      expect(response2.success).toBe(false);
      expect(response3.success).toBe(false);
    });

    it('should not include data property', () => {
      const response = ResponseBuilder.error('ERROR', { ar: 'خطأ', en: 'Error' });

      expect(response.data).toBeUndefined();
    });

    it('should handle complex details object', () => {
      const code = 'COMPLEX_ERROR';
      const message: BilingualMessage = { ar: 'خطأ معقد', en: 'Complex error' };
      const details = {
        userId: '123',
        attemptCount: 3,
        lastAttempt: new Date(),
        errors: [
          { field: 'email', message: 'Invalid' },
          { field: 'phone', message: 'Required' }
        ]
      };

      const response = ResponseBuilder.error(code, message, details);

      expect(response.error?.details).toEqual(details);
    });

    it('should preserve error code exactly as provided', () => {
      const codes = [
        'USER_NOT_FOUND',
        'INVALID_CREDENTIALS',
        'FORBIDDEN',
        'INTERNAL_SERVER_ERROR',
        'CUSTOM_ERROR_123'
      ];

      codes.forEach(code => {
        const response = ResponseBuilder.error(code, { ar: 'خطأ', en: 'Error' });
        expect(response.error?.code).toBe(code);
      });
    });

    it('should handle bilingual messages correctly', () => {
      const message: BilingualMessage = {
        ar: 'رسالة الخطأ بالعربية',
        en: 'Error message in English'
      };

      const response = ResponseBuilder.error('ERROR', message);

      expect(response.error?.message.ar).toBe('رسالة الخطأ بالعربية');
      expect(response.error?.message.en).toBe('Error message in English');
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================
  describe('Type Safety', () => {
    it('should maintain type safety for success response', () => {
      interface User {
        id: string;
        name: string;
      }

      const user: User = { id: '123', name: 'Test' };
      const response: ApiResponse<User> = ResponseBuilder.success(user);

      expect(response.data?.id).toBe('123');
      expect(response.data?.name).toBe('Test');
    });

    it('should maintain type safety for paginated response', () => {
      interface Clinic {
        id: string;
        name: string;
      }

      const clinics: Clinic[] = [
        { id: '1', name: 'Clinic 1' },
        { id: '2', name: 'Clinic 2' }
      ];

      const response: PaginatedResponse<Clinic> = ResponseBuilder.paginated(
        clinics,
        1,
        10,
        2
      );

      expect(response.data?.[0].id).toBe('1');
      expect(response.data?.[1].name).toBe('Clinic 2');
    });

    it('should maintain type safety for error response', () => {
      const response: ApiResponse = ResponseBuilder.error(
        'ERROR',
        { ar: 'خطأ', en: 'Error' }
      );

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('ERROR');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should create consistent response structures', () => {
      const successResponse = ResponseBuilder.success({ id: '1' });
      const paginatedResponse = ResponseBuilder.paginated([{ id: '1' }], 1, 10, 1);
      const errorResponse = ResponseBuilder.error('ERROR', { ar: 'خطأ', en: 'Error' });

      // All should have success property
      expect(successResponse).toHaveProperty('success');
      expect(paginatedResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('success');

      // Success responses should have data
      expect(successResponse).toHaveProperty('data');
      expect(paginatedResponse).toHaveProperty('data');
      expect(errorResponse).not.toHaveProperty('data');

      // Error response should have error
      expect(errorResponse).toHaveProperty('error');
      expect(successResponse).not.toHaveProperty('error');
      expect(paginatedResponse).not.toHaveProperty('error');
    });

    it('should work with real-world scenarios', () => {
      // Scenario 1: User creation success
      const createUserResponse = ResponseBuilder.success(
        { id: '123', email: 'user@test.com' },
        { ar: 'تم إنشاء المستخدم', en: 'User created' }
      );
      expect(createUserResponse.success).toBe(true);
      expect(createUserResponse.data).toBeDefined();
      expect(createUserResponse.message).toBeDefined();

      // Scenario 2: List users with pagination
      const listUsersResponse = ResponseBuilder.paginated(
        [{ id: '1' }, { id: '2' }],
        1,
        20,
        45
      );
      expect(listUsersResponse.meta?.totalPages).toBe(3);

      // Scenario 3: User not found error
      const notFoundResponse = ResponseBuilder.error(
        'USER_NOT_FOUND',
        { ar: 'المستخدم غير موجود', en: 'User not found' },
        { userId: '123' }
      );
      expect(notFoundResponse.success).toBe(false);
      expect(notFoundResponse.error?.details.userId).toBe('123');
    });
  });
});
