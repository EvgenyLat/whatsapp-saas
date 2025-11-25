Write-Host "================================================" -ForegroundColor Cyan
Write-Host "WhatsApp SaaS MVP - Local Testing Quick Start" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCheck) {
    Write-Host "ERROR: Docker not found. Please install Docker Desktop." -ForegroundColor Red
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Write-Host "[2/6] Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis
Start-Sleep -Seconds 5

Write-Host "[3/6] Applying database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

Write-Host "[4/6] Seeding test data..." -ForegroundColor Yellow
npx ts-node prisma/seed.ts

Write-Host "[5/6] Starting NestJS server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Server will start on http://localhost:3000" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To test with WhatsApp:" -ForegroundColor Cyan
Write-Host "1. Open new terminal and run: ngrok http 3000"
Write-Host "2. Copy ngrok URL (e.g., https://abc123.ngrok.io)"
Write-Host "3. Set WhatsApp webhook to: [ngrok-url]/api/v1/whatsapp/webhook"
Write-Host ""
Write-Host "To test with integration tests:" -ForegroundColor Cyan
Write-Host "1. Open new terminal"
Write-Host "2. Run: npm run test:integration -- --testPathPattern=zero-typing"
Write-Host ""
Write-Host "To view database:" -ForegroundColor Cyan
Write-Host "1. Open new terminal"
Write-Host "2. Run: npx prisma studio"
Write-Host "3. Open http://localhost:5555"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

npm run start:dev
