import { BilingualMessage } from '../types/response.types';

/**
 * Validation result for a single message
 */
export interface MessageValidationResult {
  key: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Overall validation result for all messages
 */
export interface ValidationReport {
  isValid: boolean;
  totalMessages: number;
  validMessages: number;
  invalidMessages: number;
  results: MessageValidationResult[];
}

/**
 * Validates that a bilingual message has both 'ar' and 'en' properties with non-empty strings
 */
export function validateBilingualMessage(
  key: string,
  message: any,
): MessageValidationResult {
  const errors: string[] = [];

  // Check if message is an object
  if (!message || typeof message !== 'object') {
    errors.push('Message is not an object');
    return { key, isValid: false, errors };
  }

  // Check for 'ar' property
  if (!('ar' in message)) {
    errors.push("Missing 'ar' property");
  } else if (typeof message.ar !== 'string') {
    errors.push("'ar' property is not a string");
  } else if (message.ar.trim() === '') {
    errors.push("'ar' property is an empty string");
  }

  // Check for 'en' property
  if (!('en' in message)) {
    errors.push("Missing 'en' property");
  } else if (typeof message.en !== 'string') {
    errors.push("'en' property is not a string");
  } else if (message.en.trim() === '') {
    errors.push("'en' property is an empty string");
  }

  return {
    key,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates all messages in a message collection
 */
export function validateMessageCollection(
  messages: Record<string, any>,
  collectionName: string = 'Messages',
): ValidationReport {
  const results: MessageValidationResult[] = [];

  for (const [key, message] of Object.entries(messages)) {
    const result = validateBilingualMessage(`${collectionName}.${key}`, message);
    results.push(result);
  }

  const validMessages = results.filter((r) => r.isValid).length;
  const invalidMessages = results.filter((r) => !r.isValid).length;

  return {
    isValid: invalidMessages === 0,
    totalMessages: results.length,
    validMessages,
    invalidMessages,
    results,
  };
}

/**
 * Validates multiple message collections
 */
export function validateAllMessageCollections(
  collections: Array<{ name: string; messages: Record<string, any> }>,
): ValidationReport {
  const allResults: MessageValidationResult[] = [];

  for (const collection of collections) {
    const report = validateMessageCollection(collection.messages, collection.name);
    allResults.push(...report.results);
  }

  const validMessages = allResults.filter((r) => r.isValid).length;
  const invalidMessages = allResults.filter((r) => !r.isValid).length;

  return {
    isValid: invalidMessages === 0,
    totalMessages: allResults.length,
    validMessages,
    invalidMessages,
    results: allResults,
  };
}

/**
 * Formats a validation report as a human-readable string
 */
export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('=== Bilingual Message Validation Report ===');
  lines.push(`Total Messages: ${report.totalMessages}`);
  lines.push(`Valid Messages: ${report.validMessages}`);
  lines.push(`Invalid Messages: ${report.invalidMessages}`);
  lines.push(`Overall Status: ${report.isValid ? '✓ PASS' : '✗ FAIL'}`);
  lines.push('');

  if (report.invalidMessages > 0) {
    lines.push('Invalid Messages:');
    lines.push('');

    for (const result of report.results) {
      if (!result.isValid) {
        lines.push(`  ${result.key}:`);
        for (const error of result.errors) {
          lines.push(`    - ${error}`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Asserts that all messages in a collection are valid bilingual messages
 * Throws an error if validation fails
 */
export function assertValidBilingualMessages(
  messages: Record<string, any>,
  collectionName: string = 'Messages',
): void {
  const report = validateMessageCollection(messages, collectionName);

  if (!report.isValid) {
    const errorMessage = formatValidationReport(report);
    throw new Error(`Bilingual message validation failed:\n${errorMessage}`);
  }
}

/**
 * Asserts that all messages in multiple collections are valid
 * Throws an error if validation fails
 */
export function assertAllValidBilingualMessages(
  collections: Array<{ name: string; messages: Record<string, any> }>,
): void {
  const report = validateAllMessageCollections(collections);

  if (!report.isValid) {
    const errorMessage = formatValidationReport(report);
    throw new Error(`Bilingual message validation failed:\n${errorMessage}`);
  }
}
