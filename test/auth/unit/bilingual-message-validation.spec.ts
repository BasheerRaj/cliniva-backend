import {
  validateBilingualMessage,
  validateMessageCollection,
  validateAllMessageCollections,
  assertValidBilingualMessages,
  assertAllValidBilingualMessages,
} from '../../../src/common/utils/bilingual-message-validator.util';
import {
  AUTH_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
} from '../../../src/common/constants/auth-error-messages.constant';

describe('Bilingual Message Validation', () => {
  describe('validateBilingualMessage', () => {
    it('should validate a correct bilingual message', () => {
      const message = {
        ar: 'رسالة بالعربية',
        en: 'Message in English',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing ar property', () => {
      const message = {
        en: 'Message in English',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing 'ar' property");
    });

    it('should detect missing en property', () => {
      const message = {
        ar: 'رسالة بالعربية',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing 'en' property");
    });

    it('should detect empty ar string', () => {
      const message = {
        ar: '',
        en: 'Message in English',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'ar' property is an empty string");
    });

    it('should detect empty en string', () => {
      const message = {
        ar: 'رسالة بالعربية',
        en: '',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'en' property is an empty string");
    });

    it('should detect whitespace-only strings', () => {
      const message = {
        ar: '   ',
        en: '   ',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'ar' property is an empty string");
      expect(result.errors).toContain("'en' property is an empty string");
    });

    it('should detect non-string ar property', () => {
      const message = {
        ar: 123,
        en: 'Message in English',
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'ar' property is not a string");
    });

    it('should detect non-string en property', () => {
      const message = {
        ar: 'رسالة بالعربية',
        en: 123,
      };

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'en' property is not a string");
    });

    it('should detect non-object message', () => {
      const message = 'not an object';

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message is not an object');
    });

    it('should detect null message', () => {
      const message = null;

      const result = validateBilingualMessage('TEST_MESSAGE', message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message is not an object');
    });
  });

  describe('validateMessageCollection', () => {
    it('should validate a collection of correct messages', () => {
      const messages = {
        MESSAGE_1: {
          ar: 'رسالة 1',
          en: 'Message 1',
        },
        MESSAGE_2: {
          ar: 'رسالة 2',
          en: 'Message 2',
        },
      };

      const report = validateMessageCollection(messages, 'TestMessages');

      expect(report.isValid).toBe(true);
      expect(report.totalMessages).toBe(2);
      expect(report.validMessages).toBe(2);
      expect(report.invalidMessages).toBe(0);
    });

    it('should detect invalid messages in a collection', () => {
      const messages = {
        VALID_MESSAGE: {
          ar: 'رسالة صحيحة',
          en: 'Valid message',
        },
        INVALID_MESSAGE: {
          ar: 'رسالة غير صحيحة',
          // Missing 'en' property
        },
      };

      const report = validateMessageCollection(messages, 'TestMessages');

      expect(report.isValid).toBe(false);
      expect(report.totalMessages).toBe(2);
      expect(report.validMessages).toBe(1);
      expect(report.invalidMessages).toBe(1);
    });
  });

  describe('validateAllMessageCollections', () => {
    it('should validate multiple collections', () => {
      const collections = [
        {
          name: 'Collection1',
          messages: {
            MSG_1: { ar: 'رسالة 1', en: 'Message 1' },
          },
        },
        {
          name: 'Collection2',
          messages: {
            MSG_2: { ar: 'رسالة 2', en: 'Message 2' },
          },
        },
      ];

      const report = validateAllMessageCollections(collections);

      expect(report.isValid).toBe(true);
      expect(report.totalMessages).toBe(2);
      expect(report.validMessages).toBe(2);
      expect(report.invalidMessages).toBe(0);
    });

    it('should detect invalid messages across collections', () => {
      const collections = [
        {
          name: 'Collection1',
          messages: {
            VALID_MSG: { ar: 'رسالة صحيحة', en: 'Valid message' },
          },
        },
        {
          name: 'Collection2',
          messages: {
            INVALID_MSG: { ar: 'رسالة غير صحيحة' }, // Missing 'en'
          },
        },
      ];

      const report = validateAllMessageCollections(collections);

      expect(report.isValid).toBe(false);
      expect(report.totalMessages).toBe(2);
      expect(report.validMessages).toBe(1);
      expect(report.invalidMessages).toBe(1);
    });
  });

  describe('assertValidBilingualMessages', () => {
    it('should not throw for valid messages', () => {
      const messages = {
        MESSAGE_1: {
          ar: 'رسالة 1',
          en: 'Message 1',
        },
      };

      expect(() => {
        assertValidBilingualMessages(messages, 'TestMessages');
      }).not.toThrow();
    });

    it('should throw for invalid messages', () => {
      const messages = {
        INVALID_MESSAGE: {
          ar: 'رسالة غير صحيحة',
          // Missing 'en' property
        },
      };

      expect(() => {
        assertValidBilingualMessages(messages, 'TestMessages');
      }).toThrow('Bilingual message validation failed');
    });
  });

  describe('assertAllValidBilingualMessages', () => {
    it('should not throw for valid collections', () => {
      const collections = [
        {
          name: 'Collection1',
          messages: {
            MSG_1: { ar: 'رسالة 1', en: 'Message 1' },
          },
        },
      ];

      expect(() => {
        assertAllValidBilingualMessages(collections);
      }).not.toThrow();
    });

    it('should throw for invalid collections', () => {
      const collections = [
        {
          name: 'Collection1',
          messages: {
            INVALID_MSG: { ar: 'رسالة غير صحيحة' }, // Missing 'en'
          },
        },
      ];

      expect(() => {
        assertAllValidBilingualMessages(collections);
      }).toThrow('Bilingual message validation failed');
    });
  });

  /**
   * CRITICAL TEST: Validates all actual message collections in the project
   * This test will fail if any message is missing translations
   */
  describe('Project Message Collections Validation', () => {
    it('should validate AUTH_ERROR_MESSAGES has all translations', () => {
      expect(() => {
        assertValidBilingualMessages(
          AUTH_ERROR_MESSAGES,
          'AUTH_ERROR_MESSAGES',
        );
      }).not.toThrow();
    });

    it('should validate AUTH_SUCCESS_MESSAGES has all translations', () => {
      expect(() => {
        assertValidBilingualMessages(
          AUTH_SUCCESS_MESSAGES,
          'AUTH_SUCCESS_MESSAGES',
        );
      }).not.toThrow();
    });

    it('should validate all auth message collections together', () => {
      const collections = [
        {
          name: 'AUTH_ERROR_MESSAGES',
          messages: AUTH_ERROR_MESSAGES,
        },
        {
          name: 'AUTH_SUCCESS_MESSAGES',
          messages: AUTH_SUCCESS_MESSAGES,
        },
      ];

      expect(() => {
        assertAllValidBilingualMessages(collections);
      }).not.toThrow();
    });

    it('should provide detailed report for AUTH_ERROR_MESSAGES', () => {
      const report = validateMessageCollection(
        AUTH_ERROR_MESSAGES,
        'AUTH_ERROR_MESSAGES',
      );

      expect(report.isValid).toBe(true);
      expect(report.invalidMessages).toBe(0);
      expect(report.totalMessages).toBeGreaterThan(0);

      // Log the report for visibility
      if (!report.isValid) {
        console.error('AUTH_ERROR_MESSAGES validation failed:');
        report.results
          .filter((r) => !r.isValid)
          .forEach((r) => {
            console.error(`  ${r.key}:`);
            r.errors.forEach((e) => console.error(`    - ${e}`));
          });
      }
    });

    it('should provide detailed report for AUTH_SUCCESS_MESSAGES', () => {
      const report = validateMessageCollection(
        AUTH_SUCCESS_MESSAGES,
        'AUTH_SUCCESS_MESSAGES',
      );

      expect(report.isValid).toBe(true);
      expect(report.invalidMessages).toBe(0);
      expect(report.totalMessages).toBeGreaterThan(0);

      // Log the report for visibility
      if (!report.isValid) {
        console.error('AUTH_SUCCESS_MESSAGES validation failed:');
        report.results
          .filter((r) => !r.isValid)
          .forEach((r) => {
            console.error(`  ${r.key}:`);
            r.errors.forEach((e) => console.error(`    - ${e}`));
          });
      }
    });

    it('should verify each AUTH_ERROR_MESSAGES entry individually', () => {
      const entries = Object.entries(AUTH_ERROR_MESSAGES);

      expect(entries.length).toBeGreaterThan(0);

      entries.forEach(([key, message]) => {
        const result = validateBilingualMessage(key, message);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Verify structure
        expect(message).toHaveProperty('ar');
        expect(message).toHaveProperty('en');
        expect(typeof message.ar).toBe('string');
        expect(typeof message.en).toBe('string');
        expect(message.ar.trim()).not.toBe('');
        expect(message.en.trim()).not.toBe('');
      });
    });

    it('should verify each AUTH_SUCCESS_MESSAGES entry individually', () => {
      const entries = Object.entries(AUTH_SUCCESS_MESSAGES);

      expect(entries.length).toBeGreaterThan(0);

      entries.forEach(([key, message]) => {
        const result = validateBilingualMessage(key, message);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Verify structure
        expect(message).toHaveProperty('ar');
        expect(message).toHaveProperty('en');
        expect(typeof message.ar).toBe('string');
        expect(typeof message.en).toBe('string');
        expect(message.ar.trim()).not.toBe('');
        expect(message.en.trim()).not.toBe('');
      });
    });
  });
});
