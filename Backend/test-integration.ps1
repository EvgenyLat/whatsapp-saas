Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Running Integration Tests" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Starting PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres
Start-Sleep -Seconds 3

Write-Host "[2/3] Applying migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

Write-Host "[3/3] Running tests..." -ForegroundColor Yellow
Write-Host ""

npm run test:integration -- --testPathPattern=zero-typing --verbose

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Test execution complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Read-Host -Prompt "Press Enter to exit"
