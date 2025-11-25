// Test setup file
const fs = require('fs');
const path = require('path');

// Ensure test data directory exists
const testDataDir = path.join(__dirname, '..', 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Clean up test data after each test
afterEach(() => {
  const testDataDir = path.join(__dirname, '..', 'test-data');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
});

// Global test timeout
jest.setTimeout(10000);
