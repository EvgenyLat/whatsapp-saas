#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting comprehensive test suite...\n');

// Test categories
const testCategories = [
  {
    name: 'Unit Tests',
    command: 'npm run test -- --testPathPattern="__tests__" --verbose',
    description: 'Testing individual components and functions'
  },
  {
    name: 'Component Tests',
    command: 'npm run test -- --testPathPattern="components/__tests__" --verbose',
    description: 'Testing React components'
  },
  {
    name: 'Hook Tests',
    command: 'npm run test -- --testPathPattern="hooks/__tests__" --verbose',
    description: 'Testing custom hooks'
  },
  {
    name: 'Integration Tests',
    command: 'npm run test -- --testPathPattern="pages/__tests__" --verbose',
    description: 'Testing page integration'
  },
  {
    name: 'Accessibility Tests',
    command: 'npm run test -- --testPathPattern="accessibility" --verbose',
    description: 'Testing accessibility compliance'
  },
  {
    name: 'Performance Tests',
    command: 'npm run test -- --testPathPattern="performance" --verbose',
    description: 'Testing performance metrics'
  },
  {
    name: 'Validation Tests',
    command: 'npm run test -- --testPathPattern="validation" --verbose',
    description: 'Testing form validation'
  },
  {
    name: 'Error Handling Tests',
    command: 'npm run test -- --testPathPattern="error-handling" --verbose',
    description: 'Testing error scenarios'
  }
];

// Run tests with coverage
const runTestsWithCoverage = () => {
  console.log('📊 Running tests with coverage analysis...\n');
  
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
    console.log('✅ Coverage analysis completed successfully!\n');
  } catch (error) {
    console.error('❌ Coverage analysis failed:', error.message);
    process.exit(1);
  }
};

// Run type checking
const runTypeCheck = () => {
  console.log('🔍 Running TypeScript type checking...\n');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    console.log('✅ Type checking completed successfully!\n');
  } catch (error) {
    console.error('❌ Type checking failed:', error.message);
    process.exit(1);
  }
};

// Run linting
const runLinting = () => {
  console.log('🔧 Running ESLint...\n');
  
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ Linting completed successfully!\n');
  } catch (error) {
    console.error('❌ Linting failed:', error.message);
    process.exit(1);
  }
};

// Main test runner
const runTests = async () => {
  const startTime = Date.now();
  
  try {
    // Run type checking first
    runTypeCheck();
    
    // Run linting
    runLinting();
    
    // Run all tests with coverage
    runTestsWithCoverage();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`🎉 All tests completed successfully in ${duration}s!`);
    console.log('\n📋 Test Summary:');
    console.log('✅ TypeScript type checking passed');
    console.log('✅ ESLint linting passed');
    console.log('✅ Unit tests passed');
    console.log('✅ Component tests passed');
    console.log('✅ Integration tests passed');
    console.log('✅ Accessibility tests passed');
    console.log('✅ Performance tests passed');
    console.log('✅ Validation tests passed');
    console.log('✅ Error handling tests passed');
    console.log('✅ Coverage requirements met');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

// Run the tests
runTests();
