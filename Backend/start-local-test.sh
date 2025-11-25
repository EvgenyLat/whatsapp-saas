#!/bin/bash

echo "================================================"
echo "WhatsApp SaaS MVP - Local Testing Quick Start"
echo "================================================"
echo ""

echo "[1/6] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker not found. Please install Docker."
    exit 1
fi

echo "[2/6] Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis
sleep 5

echo "[3/6] Applying database migrations..."
npx prisma migrate deploy

echo "[4/6] Seeding test data..."
npx ts-node prisma/seed.ts

echo "[5/6] Starting NestJS server..."
echo ""
echo "================================================"
echo "Server will start on http://localhost:3000"
echo "================================================"
echo ""
echo "To test with WhatsApp:"
echo "1. Open new terminal and run: ngrok http 3000"
echo "2. Copy ngrok URL (e.g., https://abc123.ngrok.io)"
echo "3. Set WhatsApp webhook to: [ngrok-url]/api/v1/whatsapp/webhook"
echo ""
echo "To test with integration tests:"
echo "1. Open new terminal"
echo "2. Run: npm run test:integration -- --testPathPattern=zero-typing"
echo ""
echo "To view database:"
echo "1. Open new terminal"
echo "2. Run: npx prisma studio"
echo "3. Open http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

npm run start:dev
