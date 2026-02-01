import { setupTestEnvironment, resetTestEnvironment } from './utils/test.utils';

// Global test setup
beforeAll(async () => {
  // Setup test environment variables
  setupTestEnvironment();

  // Set longer timeout for database operations
  jest.setTimeout(30000);
});

// Global test teardown
afterAll(async () => {
  // Reset environment variables
  resetTestEnvironment();
});

// Setup for each test file
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console.log in tests unless explicitly needed
const originalLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE === 'true') {
    originalLog(...args);
  }
};
