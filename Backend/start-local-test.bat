@echo off
echo ================================================
echo WhatsApp SaaS MVP - Local Testing Quick Start
echo ================================================
echo.

echo [1/6] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)

echo [2/6] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis
timeout /t 5 /nobreak >nul

echo [3/6] Applying database migrations...
call npx prisma migrate deploy

echo [4/6] Seeding test data...
call npx ts-node prisma/seed.ts

echo [5/6] Starting NestJS server...
echo.
echo ================================================
echo Server will start on http://localhost:3000
echo ================================================
echo.
echo To test with WhatsApp:
echo 1. Open new terminal and run: ngrok http 3000
echo 2. Copy ngrok URL (e.g., https://abc123.ngrok.io)
echo 3. Set WhatsApp webhook to: [ngrok-url]/api/v1/whatsapp/webhook
echo.
echo To test with integration tests:
echo 1. Open new terminal
echo 2. Run: npm run test:integration -- --testPathPattern=zero-typing
echo.
echo To view database:
echo 1. Open new terminal
echo 2. Run: npx prisma studio
echo 3. Open http://localhost:5555
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

call npm run start:dev
