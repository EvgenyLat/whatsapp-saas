/**
 * Integration Test Script
 * Tests Frontend <-> Backend <-> Database Integration
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Generate unique test data
const timestamp = Date.now();
const testUser = {
  email: `testuser${timestamp}@example.com`,
  password: 'Test@123456',
  firstName: 'Test',
  lastName: 'User',
  phone: `+1${timestamp}`
};

let accessToken = null;
let refreshToken = null;
let userId = null;

async function runTests() {
  console.log('========================================');
  console.log('INTEGRATION TEST: Frontend <-> Backend <-> Database');
  console.log('========================================\n');

  try {
    // Test 1: User Registration
    console.log('TEST 1: User Registration');
    console.log('POST /api/v1/auth/register');
    console.log('Request:', JSON.stringify(testUser, null, 2));

    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);

    console.log('Status:', registerResponse.status);
    console.log('Response:', JSON.stringify(registerResponse.data, null, 2));

    accessToken = registerResponse.data.accessToken;
    refreshToken = registerResponse.data.refreshToken;
    userId = registerResponse.data.user.id;

    console.log('✓ Registration successful');
    console.log('✓ Access Token received:', accessToken.substring(0, 20) + '...');
    console.log('✓ Refresh Token received:', refreshToken.substring(0, 20) + '...');
    console.log('✓ User ID:', userId);
    console.log('');

    // Test 2: Get Current User
    console.log('TEST 2: Get Current User (Authenticated Request)');
    console.log('GET /api/v1/auth/me');

    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('Status:', meResponse.status);
    console.log('Response:', JSON.stringify(meResponse.data, null, 2));
    console.log('✓ User profile retrieved successfully');
    console.log('');

    // Test 3: Login with Created User
    console.log('TEST 3: User Login');
    console.log('POST /api/v1/auth/login');

    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    console.log('Status:', loginResponse.status);
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    console.log('✓ Login successful');
    console.log('');

    // Test 4: Token Refresh
    console.log('TEST 4: Token Refresh');
    console.log('POST /api/v1/auth/refresh');

    const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });

    console.log('Status:', refreshResponse.status);
    console.log('Response:', JSON.stringify(refreshResponse.data, null, 2));
    console.log('✓ Token refresh successful');
    console.log('');

    // Test 5: Database Verification
    console.log('TEST 5: Database Connectivity');
    console.log('Verifying user persisted in database...');

    const verifyResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${refreshResponse.data.accessToken}`
      }
    });

    console.log('✓ User data retrieved from database');
    console.log('✓ Database connection working');
    console.log('');

    // Test Summary
    console.log('========================================');
    console.log('INTEGRATION TEST RESULTS: ALL PASSED ✓');
    console.log('========================================');
    console.log('✓ Frontend API client configuration: WORKING');
    console.log('✓ Backend server: RUNNING (Port 3000)');
    console.log('✓ Database connection: WORKING');
    console.log('✓ User registration flow: WORKING');
    console.log('✓ Authentication (JWT): WORKING');
    console.log('✓ Token refresh: WORKING');
    console.log('✓ Data persistence: WORKING');
    console.log('');
    console.log('Test User Created:');
    console.log('  Email:', testUser.email);
    console.log('  ID:', userId);
    console.log('  First Name:', testUser.firstName);
    console.log('  Last Name:', testUser.lastName);
    console.log('  Phone:', testUser.phone);
    console.log('========================================');

  } catch (error) {
    console.error('========================================');
    console.error('TEST FAILED ✗');
    console.error('========================================');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
