#!/usr/bin/env node

const http = require('http');

const API_BASE = 'http://localhost:3000/api/v1';
let accessToken = '';
let refreshToken = '';
let userId = '';
const testEmail = `test${Date.now()}@example.com`;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('Testing WhatsApp SaaS Authentication');
  console.log('========================================\n');

  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerResponse = await makeRequest('POST', '/auth/register', {
      email: testEmail,
      password: 'TestP@ssw0rd123',
      firstName: 'Test',
      lastName: 'User',
    });

    if (registerResponse.status !== 201) {
      console.error('   ❌ Registration failed:', registerResponse.status, registerResponse.data);
      return;
    }

    accessToken = registerResponse.data.accessToken;
    refreshToken = registerResponse.data.refreshToken;
    userId = registerResponse.data.user.id;

    console.log('   ✅ User registered successfully');
    console.log('      User ID:', userId);
    console.log('      Email:', registerResponse.data.user.email);
    console.log('      Role:', registerResponse.data.user.role);

    // Test 2: Get current user
    console.log('\n2. Testing get current user...');
    const meResponse = await makeRequest('GET', '/auth/me', null, accessToken);

    if (meResponse.status !== 200) {
      console.error('   ❌ Get current user failed:', meResponse.status);
      return;
    }

    console.log('   ✅ Current user retrieved successfully');
    console.log('      Email:', meResponse.data.email);
    console.log('      Verified:', meResponse.data.isEmailVerified);

    // Test 3: Login with credentials
    console.log('\n3. Testing login...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: 'TestP@ssw0rd123',
    });

    if (loginResponse.status !== 200) {
      console.error('   ❌ Login failed:', loginResponse.status);
      return;
    }

    console.log('   ✅ Login successful');
    console.log('      New access token received');

    // Update tokens
    accessToken = loginResponse.data.accessToken;
    const oldRefreshToken = refreshToken;
    refreshToken = loginResponse.data.refreshToken;

    // Test 4: Refresh token
    console.log('\n4. Testing token refresh...');
    const refreshResponse = await makeRequest('POST', '/auth/refresh', {
      refreshToken: refreshToken,
    });

    if (refreshResponse.status !== 200) {
      console.error('   ❌ Token refresh failed:', refreshResponse.status);
      return;
    }

    console.log('   ✅ Token refreshed successfully');
    accessToken = refreshResponse.data.accessToken;
    refreshToken = refreshResponse.data.refreshToken;

    // Test 5: Forgot password
    console.log('\n5. Testing forgot password...');
    const forgotResponse = await makeRequest('POST', '/auth/forgot-password', {
      email: testEmail,
    });

    if (forgotResponse.status !== 200) {
      console.error('   ❌ Forgot password failed:', forgotResponse.status);
      return;
    }

    console.log('   ✅ Forgot password request successful');
    console.log('      Message:', forgotResponse.data.message);

    // Test 6: Logout
    console.log('\n6. Testing logout...');
    const logoutResponse = await makeRequest('POST', '/auth/logout', {
      refreshToken: refreshToken,
    }, accessToken);

    if (logoutResponse.status !== 200) {
      console.error('   ❌ Logout failed:', logoutResponse.status);
      return;
    }

    console.log('   ✅ Logout successful');

    // Test 7: Try to use revoked token (should fail)
    console.log('\n7. Testing revoked refresh token...');
    const revokedResponse = await makeRequest('POST', '/auth/refresh', {
      refreshToken: refreshToken,
    });

    if (revokedResponse.status === 401) {
      console.log('   ✅ Revoked token correctly rejected');
    } else {
      console.error('   ❌ Revoked token was accepted (should fail)');
    }

    console.log('\n========================================');
    console.log('✅ All authentication tests passed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.log('\n========================================');
    console.log('Tests failed!');
    console.log('========================================\n');
  }
}

// Wait a bit for server to be ready
setTimeout(runTests, 1000);
