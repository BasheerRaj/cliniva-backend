module.exports = {
  displayName: 'Auth Tests',
  testMatch: ['<rootDir>/test/auth/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/auth/**/*.(t|j)s',
    '!src/auth/**/*.spec.ts',
    '!src/auth/**/*.e2e-spec.ts',
    '!src/auth/**/index.ts',
    '!src/auth/examples/**/*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/auth',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/auth/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  forceExit: true,
  detectOpenHandles: true,
};




