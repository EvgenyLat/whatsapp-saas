#!/bin/bash

echo "==================================="
echo "Testing Authentication Endpoints"
echo "==================================="

# Test 1: Register
echo -e "\n1. Testing Register..."
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user002@example.com","password":"TestP@ssw0rd123","firstName":"Test","lastName":"User"}' \
  -o /tmp/register.json
echo "Status: Registration successful"

# Test 2: Login
echo -e "\n2. Testing Login..."
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user002@example.com","password":"TestP@ssw0rd123"}' \
  -o /tmp/login.json

ACCESS_TOKEN=$(cat /tmp/login.json | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(cat /tmp/login.json | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
echo "Status: Login successful"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# Test 3: Get Current User
echo -e "\n3. Testing Get Current User..."
curl -s -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o /tmp/me.json
echo "Status: Get current user successful"
cat /tmp/me.json | head -c 150
echo "..."

# Test 4: Refresh Token
echo -e "\n\n4. Testing Refresh Token..."
curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
  -o /tmp/refresh.json

NEW_ACCESS_TOKEN=$(cat /tmp/refresh.json | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
  echo "Status: Token refresh successful"
else
  echo "Status: Token refresh failed"
  cat /tmp/refresh.json
fi

# Test 5: Forgot Password
echo -e "\n5. Testing Forgot Password..."
curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user002@example.com"}' \
  -o /tmp/forgot.json
cat /tmp/forgot.json
echo ""

echo -e "\n==================================="
echo "All endpoint tests completed!"
echo "==================================="
