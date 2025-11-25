#!/bin/bash

echo "================================================"
echo "Running Integration Tests"
echo "================================================"
echo ""

echo "[1/3] Starting PostgreSQL..."
docker-compose up -d postgres
sleep 3

echo "[2/3] Applying migrations..."
npx prisma migrate deploy

echo "[3/3] Running tests..."
echo ""

npm run test:integration -- --testPathPattern=zero-typing --verbose

echo ""
echo "================================================"
echo "Test execution complete!"
echo "================================================"
