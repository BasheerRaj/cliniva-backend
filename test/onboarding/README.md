# Onboarding Module Test Suite

This comprehensive test suite covers all aspects of the onboarding functionality in the Cliniva backend application, ensuring that the onboarding logic is correct, reliable, and handles all edge cases properly.

## 📁 Test Structure

```
test/onboarding/
├── README.md                           # This documentation
├── jest.config.js                      # Jest configuration for onboarding tests
├── setup.ts                           # Test setup and MongoDB memory server
├── global-setup.ts                    # Global test setup
├── global-teardown.ts                 # Global test cleanup
├── fixtures/                          # Test data fixtures
│   └── onboarding-data.fixture.ts     # Sample onboarding data for all plan types
├── mocks/                             # Service mocks
│   └── service.mocks.ts               # Mock implementations for all services
├── unit/                              # Unit tests
│   ├── validation.util.spec.ts        # Tests for ValidationUtil
│   ├── plan-config.util.spec.ts       # Tests for PlanConfigUtil
│   ├── entity-relationship.util.spec.ts # Tests for EntityRelationshipUtil
│   ├── data-transformer.util.spec.ts  # Tests for DataTransformerUtil
│   └── onboarding.service.spec.ts     # Unit tests for OnboardingService
├── integration/                       # Integration tests
│   └── onboarding.service.integration.spec.ts # End-to-end service tests
├── e2e/                               # End-to-end tests
│   └── onboarding.controller.e2e.spec.ts # HTTP endpoint tests
├── plan-types/                        # Plan-specific tests
│   ├── company-plan.spec.ts           # Company plan comprehensive tests
│   ├── complex-plan.spec.ts           # Complex plan comprehensive tests
│   └── clinic-plan.spec.ts            # Clinic plan comprehensive tests
├── working-hours/                     # Working hours validation tests
│   └── hierarchical-validation.spec.ts # Hierarchical working hours tests
├── error-scenarios/                   # Error handling tests
│   └── error-scenarios.spec.ts        # Comprehensive error scenario tests
└── validation/                        # Validation logic tests
    └── comprehensive-validation.spec.ts # All validation rules and constraints
```

## 🎯 Test Coverage Areas

### 1. Unit Tests
- **ValidationUtil**: All validation functions including VAT/CR numbers, phone numbers, emails, working hours, business profiles
- **PlanConfigUtil**: Plan configuration retrieval and limits validation
- **EntityRelationshipUtil**: Entity hierarchy validation and dependency checking
- **DataTransformerUtil**: Data transformation and normalization functions
- **OnboardingService**: Core business logic methods

### 2. Integration Tests
- Full onboarding flow with real database operations
- Transaction management and rollback scenarios
- Supporting entities creation (working hours, contacts, legal documents)
- Data consistency across all entities

### 3. End-to-End Tests
- HTTP endpoint testing for all onboarding API routes
- Request/response validation
- Error handling at API level
- Large payload handling
- Concurrent request processing

### 4. Plan-Specific Tests
- **Company Plan**: Organization-complex-clinic hierarchy, business profile validation
- **Complex Plan**: Complex-department relationships, legal information validation
- **Clinic Plan**: Capacity requirements, service management

### 5. Working Hours Tests
- Hierarchical validation (organization → complex → clinic)
- Time constraint enforcement
- Break time validation
- Multi-day schedule validation

### 6. Error Scenarios
- Service failure handling
- Database transaction failures
- Data validation errors
- Memory and performance edge cases
- Recovery and cleanup scenarios

### 7. Comprehensive Validation
- All business rules and constraints
- Plan limits enforcement
- Entity relationship validation
- Contact information validation
- Integration of all validation rules

## 🚀 Running Tests

### Prerequisites
```bash
npm install
```

### Run All Onboarding Tests
```bash
# Run all onboarding tests
npm run test:onboarding

# Run with coverage
npm run test:onboarding:coverage

# Run in watch mode
npm run test:onboarding:watch
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:onboarding:unit

# Integration tests only
npm run test:onboarding:integration

# E2E tests only
npm run test:onboarding:e2e

# Plan-specific tests
npm run test:onboarding:plans

# Working hours tests
npm run test:onboarding:working-hours

# Error scenario tests
npm run test:onboarding:errors

# Validation tests
npm run test:onboarding:validation
```

### Run Individual Test Files
```bash
# Run specific test file
npx jest test/onboarding/unit/validation.util.spec.ts

# Run with specific pattern
npx jest --testPathPattern=onboarding/plan-types
```

## 📊 Test Coverage Requirements

The test suite aims for comprehensive coverage:

- **Line Coverage**: > 95%
- **Function Coverage**: 100%
- **Branch Coverage**: > 90%
- **Statement Coverage**: > 95%

### Coverage Areas:
- ✅ All utility functions
- ✅ All service methods
- ✅ All controller endpoints
- ✅ All validation rules
- ✅ All error scenarios
- ✅ All plan types and variations
- ✅ All working hours scenarios
- ✅ All entity relationships

## 🧪 Test Data and Fixtures

### Valid Test Data
The `fixtures/onboarding-data.fixture.ts` contains:
- Valid company plan data with full hierarchy
- Valid complex plan data with departments and clinics
- Valid clinic plan data with services and capacity
- Working hours examples for all entity types
- Contact information examples
- Business profile examples

### Invalid Test Data
- Plan validation failures
- Entity limit violations
- Working hours conflicts
- Invalid business profiles
- Malformed data structures

### Mock Services
- All external service dependencies are mocked
- Configurable success/failure scenarios
- Transaction simulation
- Database operation mocking

## 🔍 Test Scenarios Covered

### Validation Scenarios
- ✅ Plan type validation (company, complex, clinic)
- ✅ Entity hierarchy validation
- ✅ Plan limits enforcement
- ✅ Business profile validation (VAT, CR, year established)
- ✅ Working hours format and hierarchy validation
- ✅ Contact information validation (emails, phones, social media)
- ✅ Legal information validation

### Business Logic Scenarios
- ✅ Company plan: Organization → Complexes → Departments → Clinics
- ✅ Complex plan: Complexes → Departments → Clinics
- ✅ Clinic plan: Single clinic with capacity requirements
- ✅ Working hours hierarchical constraints
- ✅ Entity relationship validation
- ✅ Supporting entities creation (contacts, working hours, legal docs)

### Error Scenarios
- ✅ Service failures at each step
- ✅ Database transaction failures
- ✅ Validation failures
- ✅ Data corruption scenarios
- ✅ Memory and performance issues
- ✅ Concurrent request handling

### Edge Cases
- ✅ Boundary value testing (exact limits)
- ✅ Empty and null value handling
- ✅ Special characters and encoding
- ✅ Large data sets
- ✅ Malformed data structures
- ✅ Circular references

## 🔧 Test Configuration

### Jest Configuration
The test suite uses a custom Jest configuration optimized for the onboarding module:
- MongoDB Memory Server for integration tests
- Proper timeout handling for async operations
- Coverage reporting with detailed metrics
- Parallel test execution for performance

### Environment Setup
- Isolated test database for each test run
- Transaction rollback between tests
- Mock service implementations
- Cleanup procedures for proper test isolation

## 📝 Writing New Tests

### Test Structure Guidelines
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the functionality being tested
3. **Assert**: Verify the expected outcomes

### Example Test:
```typescript
describe('Feature Description', () => {
  beforeEach(() => {
    // Setup mocks and data
  });

  it('should validate specific behavior', async () => {
    // Arrange
    const testData = { /* test data */ };
    
    // Act
    const result = await service.method(testData);
    
    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Best Practices
- Use descriptive test names
- Test one behavior per test
- Include both positive and negative test cases
- Use fixtures for consistent test data
- Mock external dependencies
- Clean up after tests

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Memory Server Issues**
   ```bash
   # Clean MongoDB binary cache
   rm -rf ~/.cache/mongodb-binaries
   ```

2. **Test Timeouts**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 30000
   ```

3. **Memory Issues**
   ```bash
   # Run tests with more memory
   node --max-old-space-size=4096 ./node_modules/.bin/jest
   ```

### Debug Mode
```bash
# Run tests in debug mode
npm run test:onboarding -- --detectOpenHandles --verbose
```

## 📈 Test Metrics

The test suite includes comprehensive metrics tracking:

### Performance Metrics
- Test execution time
- Memory usage
- Database operation counts
- API response times

### Quality Metrics
- Code coverage percentages
- Test pass/fail rates
- Error scenario coverage
- Edge case coverage

### Business Metrics
- Plan type coverage
- Validation rule coverage
- Entity relationship coverage
- Working hours scenario coverage

## 🔄 Continuous Integration

The test suite is designed for CI/CD integration:

### Pre-commit Hooks
- Run unit tests before commit
- Validate test coverage thresholds
- Run linting on test files

### CI Pipeline
- Run full test suite on pull requests
- Generate coverage reports
- Performance regression testing
- Cross-environment testing

## 📚 Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## 🤝 Contributing

When adding new features to the onboarding module:

1. Add corresponding test cases
2. Update test fixtures if needed
3. Ensure all test categories pass
4. Maintain coverage thresholds
5. Document any new test scenarios

## 📞 Support

For questions about the test suite:
1. Check this README first
2. Review existing test examples
3. Check the test output for specific error messages
4. Consult the main project documentation

