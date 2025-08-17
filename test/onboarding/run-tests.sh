#!/bin/bash

# Onboarding Test Suite Runner
# This script provides easy commands to run different categories of onboarding tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print header
print_header() {
    print_color $BLUE "==========================================="
    print_color $BLUE "$1"
    print_color $BLUE "==========================================="
}

# Function to run tests with proper error handling
run_test() {
    local test_command="$1"
    local test_description="$2"
    
    print_header "$test_description"
    
    if eval "$test_command"; then
        print_color $GREEN "✅ $test_description completed successfully"
    else
        print_color $RED "❌ $test_description failed"
        exit 1
    fi
}

# Default values
COVERAGE=false
WATCH=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Onboarding Test Suite Runner"
            echo ""
            echo "Usage: $0 [OPTION] [TEST_TYPE]"
            echo ""
            echo "Options:"
            echo "  --coverage    Generate coverage report"
            echo "  --watch       Run tests in watch mode"
            echo "  --verbose     Run tests with verbose output"
            echo "  --help        Show this help message"
            echo ""
            echo "Test Types:"
            echo "  all           Run all onboarding tests (default)"
            echo "  unit          Run only unit tests"
            echo "  integration   Run only integration tests"
            echo "  e2e           Run only end-to-end tests"
            echo "  plans         Run only plan-specific tests"
            echo "  working-hours Run only working hours tests"
            echo "  errors        Run only error scenario tests"
            echo "  validation    Run only validation tests"
            echo "  utils         Run only utility tests"
            echo "  service       Run only service tests"
            echo "  controller    Run only controller tests"
            echo ""
            echo "Examples:"
            echo "  $0 --coverage all"
            echo "  $0 --watch unit"
            echo "  $0 --verbose integration"
            exit 0
            ;;
        *)
            TEST_TYPE="$1"
            shift
            ;;
    esac
done

# Default test type
if [ -z "$TEST_TYPE" ]; then
    TEST_TYPE="all"
fi

# Build Jest command
JEST_CMD="npx jest"

# Add configuration
JEST_CMD="$JEST_CMD --config test/onboarding/jest.config.js"

# Add options
if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$WATCH" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

# Print environment info
print_header "Environment Information"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "Jest Version: $(npx jest --version)"
echo "Test Type: $TEST_TYPE"
echo "Coverage: $COVERAGE"
echo "Watch Mode: $WATCH"
echo "Verbose: $VERBOSE"
echo ""

# Run tests based on type
case $TEST_TYPE in
    all)
        run_test "$JEST_CMD test/onboarding/" "All Onboarding Tests"
        ;;
    unit)
        run_test "$JEST_CMD test/onboarding/unit/" "Unit Tests"
        ;;
    integration)
        run_test "$JEST_CMD test/onboarding/integration/" "Integration Tests"
        ;;
    e2e)
        run_test "$JEST_CMD test/onboarding/e2e/" "End-to-End Tests"
        ;;
    plans)
        run_test "$JEST_CMD test/onboarding/plan-types/" "Plan-Specific Tests"
        ;;
    working-hours)
        run_test "$JEST_CMD test/onboarding/working-hours/" "Working Hours Tests"
        ;;
    errors)
        run_test "$JEST_CMD test/onboarding/error-scenarios/" "Error Scenario Tests"
        ;;
    validation)
        run_test "$JEST_CMD test/onboarding/validation/" "Validation Tests"
        ;;
    utils)
        run_test "$JEST_CMD test/onboarding/unit/*util*.spec.ts" "Utility Function Tests"
        ;;
    service)
        run_test "$JEST_CMD test/onboarding/unit/onboarding.service.spec.ts test/onboarding/integration/" "Service Tests"
        ;;
    controller)
        run_test "$JEST_CMD test/onboarding/e2e/onboarding.controller.e2e.spec.ts" "Controller Tests"
        ;;
    *)
        print_color $RED "❌ Unknown test type: $TEST_TYPE"
        print_color $YELLOW "Run '$0 --help' for available options"
        exit 1
        ;;
esac

# Print summary
print_header "Test Summary"
if [ "$COVERAGE" = true ]; then
    print_color $BLUE "📊 Coverage report generated in coverage/onboarding/"
fi
print_color $GREEN "🎉 All tests completed successfully!"

# Check coverage thresholds if coverage was generated
if [ "$COVERAGE" = true ]; then
    print_header "Coverage Analysis"
    
    # Check if coverage files exist
    if [ -f "coverage/onboarding/lcov.info" ]; then
        print_color $BLUE "📈 Coverage files generated successfully"
        
        # Extract coverage summary (if lcov-summary is available)
        if command -v lcov >/dev/null 2>&1; then
            print_color $BLUE "📋 Coverage Summary:"
            lcov --summary coverage/onboarding/lcov.info 2>/dev/null || echo "Coverage summary available in HTML report"
        fi
        
        print_color $YELLOW "🌐 Open coverage/onboarding/index.html to view detailed coverage report"
    else
        print_color $YELLOW "⚠️  Coverage files not found. Make sure jest coverage is properly configured."
    fi
fi

print_color $GREEN "✨ Test execution completed!"

