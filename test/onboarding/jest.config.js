module.exports = {
  displayName: 'Onboarding Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../../src/onboarding/**/*.ts',
    '../../src/common/utils/**/*.ts',
    '!../../src/onboarding/**/*.d.ts',
    '!../../src/onboarding/**/index.ts',
    '!../../src/onboarding/examples/**/*.ts',
  ],
  coverageDirectory: '../../coverage/onboarding',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
  },
  testTimeout: 30000,
  verbose: true,
  // MongoDB Memory Server for integration tests
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
};

