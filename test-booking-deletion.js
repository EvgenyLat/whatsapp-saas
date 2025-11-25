/**
 * Test script for booking deletion API endpoint
 * Tests the DELETE /api/v1/bookings/:id endpoint
 */

const http = require('http');

const API_BASE = 'http://localhost:3000/api/v1';

// Test credentials - get from command line arguments or use defaults
const TEST_USER = {
  email: process.argv[2] || 'test@example.com',
  password: process.argv[3] || 'Test123!'
};

// Check if credentials were provided
if (!process.argv[2] || !process.argv[3]) {
  console.log('WARNING: Using default credentials. To use custom credentials, run:');
  console.log('node test-booking-deletion.js YOUR_EMAIL YOUR_PASSWORD');
  console.log();
}

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('BOOKING DELETION API TEST');
  console.log('='.repeat(80));
  console.log();

  let authToken = null;
  let tomBookingId = null;

  try {
    // Step 1: Login to get auth token
    console.log('Step 1: Authenticating...');
    console.log(`Attempting login with: ${TEST_USER.email}`);

    const loginResponse = await makeRequest('POST', '/auth/login', TEST_USER);

    console.log(`Status: ${loginResponse.statusCode}`);

    if (loginResponse.statusCode !== 200) {
      console.error('Login failed:', loginResponse.data);
      console.log('\nPlease update TEST_USER credentials in the script with valid credentials.');
      return;
    }

    authToken = loginResponse.data.accessToken;
    console.log('Login successful!');
    console.log(`User: ${loginResponse.data.user.email}`);
    console.log(`Token: ${authToken.substring(0, 20)}...`);
    console.log();

    // Step 2: Fetch all bookings to find Tom's booking
    console.log('Step 2: Fetching bookings...');
    console.log('Looking for customer "tom" on Nov 5, 2025 at 09:00-10:30');

    const bookingsResponse = await makeRequest(
      'GET',
      '/bookings?start_date=2025-11-05&end_date=2025-11-05&limit=100',
      null,
      authToken
    );

    console.log(`Status: ${bookingsResponse.statusCode}`);

    if (bookingsResponse.statusCode !== 200) {
      console.error('Failed to fetch bookings:', bookingsResponse.data);
      return;
    }

    const bookings = bookingsResponse.data.data || [];
    console.log(`Found ${bookings.length} bookings on Nov 5, 2025`);
    console.log();

    // Find Tom's booking
    const tomBooking = bookings.find(b =>
      b.customer_name && b.customer_name.toLowerCase() === 'tom' &&
      b.start_ts && b.start_ts.includes('09:00')
    );

    if (tomBooking) {
      tomBookingId = tomBooking.id;
      console.log('Found Tom\'s booking:');
      console.log(`  ID: ${tomBooking.id}`);
      console.log(`  Customer: ${tomBooking.customer_name}`);
      console.log(`  Phone: ${tomBooking.customer_phone}`);
      console.log(`  Service: ${tomBooking.service}`);
      console.log(`  Time: ${tomBooking.start_ts} - ${tomBooking.end_ts}`);
      console.log(`  Status: ${tomBooking.status}`);
      console.log();
    } else {
      console.log('Tom\'s booking not found. Available bookings:');
      bookings.forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.customer_name} - ${b.service} - ${b.start_ts} [${b.status}]`);
      });
      console.log();

      if (bookings.length > 0) {
        console.log('Using first booking for testing...');
        tomBookingId = bookings[0].id;
        console.log(`  ID: ${bookings[0].id}`);
        console.log(`  Customer: ${bookings[0].customer_name}`);
        console.log(`  Status: ${bookings[0].status}`);
        console.log();
      } else {
        console.log('No bookings found to test with.');
        return;
      }
    }

    // Step 3: Test DELETE endpoint
    console.log('Step 3: Testing DELETE endpoint...');
    console.log(`DELETE /bookings/${tomBookingId}`);

    const deleteResponse = await makeRequest(
      'DELETE',
      `/bookings/${tomBookingId}`,
      null,
      authToken
    );

    console.log(`Status: ${deleteResponse.statusCode}`);
    console.log('Response:', JSON.stringify(deleteResponse.data, null, 2));
    console.log();

    // Step 4: Verify response format
    console.log('Step 4: Verifying response format...');
    const expectedFormat = { deleted: true, id: tomBookingId };

    if (deleteResponse.data.deleted === true && deleteResponse.data.id === tomBookingId) {
      console.log('✓ Response format is correct: { deleted: true, id: string }');
    } else {
      console.log('✗ Response format is incorrect');
      console.log('Expected:', expectedFormat);
      console.log('Received:', deleteResponse.data);
    }
    console.log();

    // Step 5: Check booking status in database
    console.log('Step 5: Checking booking status...');
    console.log(`GET /bookings/${tomBookingId}`);

    const checkResponse = await makeRequest(
      'GET',
      `/bookings/${tomBookingId}`,
      null,
      authToken
    );

    console.log(`Status: ${checkResponse.statusCode}`);

    if (checkResponse.statusCode === 200) {
      console.log('Booking still exists:');
      console.log(`  Status: ${checkResponse.data.status}`);

      if (checkResponse.data.status === 'CANCELLED') {
        console.log('✓ Booking status correctly changed to CANCELLED');
      } else {
        console.log('✗ Booking status is not CANCELLED');
      }
    } else if (checkResponse.statusCode === 404) {
      console.log('✗ Booking not found (404) - this might be a hard delete');
    } else {
      console.log('Unexpected response:', checkResponse.data);
    }
    console.log();

    // Step 6: Test fetching bookings again to see if cancelled booking is filtered
    console.log('Step 6: Testing if CANCELLED booking is filtered from list...');

    const bookingsAfterResponse = await makeRequest(
      'GET',
      '/bookings?start_date=2025-11-05&end_date=2025-11-05&limit=100',
      null,
      authToken
    );

    console.log(`Status: ${bookingsAfterResponse.statusCode}`);

    const bookingsAfter = bookingsAfterResponse.data.data || [];
    const cancelledBookingStillVisible = bookingsAfter.find(b => b.id === tomBookingId);

    if (cancelledBookingStillVisible) {
      console.log('✗ CANCELLED booking is still visible in the list');
      console.log(`  Status: ${cancelledBookingStillVisible.status}`);
    } else {
      console.log('✓ CANCELLED booking is filtered out from the list');
    }

    console.log(`Total bookings after deletion: ${bookingsAfter.length}`);
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log('Findings:');
    console.log(`1. DELETE endpoint response format: ${deleteResponse.data.deleted === true ? '✓ CORRECT' : '✗ INCORRECT'}`);
    console.log(`2. Booking status changed to CANCELLED: ${checkResponse.data?.status === 'CANCELLED' ? '✓ YES' : '✗ NO'}`);
    console.log(`3. CANCELLED booking filtered from list: ${!cancelledBookingStillVisible ? '✓ YES' : '✗ NO'}`);
    console.log();

    if (cancelledBookingStillVisible) {
      console.log('ROOT CAUSE IDENTIFIED:');
      console.log('The booking is being marked as CANCELLED (soft delete) but the frontend');
      console.log('is still displaying it. The backend GET /bookings endpoint needs to filter');
      console.log('out CANCELLED bookings by default, or the frontend needs to filter them.');
      console.log();
      console.log('RECOMMENDATION:');
      console.log('Add a default filter in the bookings repository to exclude CANCELLED bookings');
      console.log('unless explicitly requested with a query parameter like ?include_cancelled=true');
    }

  } catch (error) {
    console.error('Error running tests:', error.message);
    console.error(error);
  }
}

// Run the tests
runTests().catch(console.error);
