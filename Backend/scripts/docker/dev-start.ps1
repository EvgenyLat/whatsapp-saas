##############################################################################
# Docker Development Environment Startup Script (PowerShell)
# WhatsApp SaaS Platform
#
# Usage: .\scripts\docker\dev-start.ps1 [-Build] [-Clean] [-Tools] [-Logs]
#
# Parameters:
#   -Build        Force rebuild of containers
#   -Clean        Clean up volumes before starting
#   -Tools        Start with Adminer database management tool
#   -Logs         Show logs after starting
##############################################################################

param(
    [switch]$Build,
    [switch]$Clean,
    [switch]$Tools,
    [switch]$Logs
)

# Error handling
$ErrorActionPreference = "Stop"

# Get script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\..\.."

# Change to project root
Set-Location $ProjectRoot

Write-Host "========================================" -ForegroundColor Blue
Write-Host "WhatsApp SaaS - Development Environment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file. Please update with your credentials." -ForegroundColor Green
    Write-Host ""
}

# Clean volumes if requested
if ($Clean) {
    Write-Host "Cleaning up volumes..." -ForegroundColor Yellow
    docker-compose down -v
    Write-Host "Volumes cleaned" -ForegroundColor Green
    Write-Host ""
}

# Build flags
$BuildFlag = if ($Build) { "--build" } else { "" }
$ToolsFlag = if ($Tools) { "--profile tools" } else { "" }

# Start containers
Write-Host "Starting Docker containers..." -ForegroundColor Green
$cmd = "docker-compose up -d $BuildFlag $ToolsFlag"
Invoke-Expression $cmd

# Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check health
Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Green
docker-compose ps

# Run migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Green
try {
    docker-compose exec -T backend npx prisma migrate deploy
} catch {
    Write-Host "Migrations failed - may need manual intervention" -ForegroundColor Yellow
}

# Generate Prisma client
Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Green
try {
    docker-compose exec -T backend npx prisma generate
} catch {
    Write-Host "Prisma generate failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Development environment is ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Blue
Write-Host "  Backend API:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "  API Docs:     " -NoNewline; Write-Host "http://localhost:3000/api/docs" -ForegroundColor Green
Write-Host "  Health Check: " -NoNewline; Write-Host "http://localhost:3000/api/v1/health" -ForegroundColor Green
Write-Host "  PostgreSQL:   " -NoNewline; Write-Host "localhost:5432" -ForegroundColor Green
Write-Host "  Redis:        " -NoNewline; Write-Host "localhost:6379" -ForegroundColor Green

if ($Tools) {
    Write-Host "  Adminer:      " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor Green
}

Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host "  View logs:       " -NoNewline; Write-Host "docker-compose logs -f backend" -ForegroundColor Yellow
Write-Host "  Stop services:   " -NoNewline; Write-Host "docker-compose down" -ForegroundColor Yellow
Write-Host "  Restart backend: " -NoNewline; Write-Host "docker-compose restart backend" -ForegroundColor Yellow
Write-Host "  Run tests:       " -NoNewline; Write-Host "docker-compose exec backend npm test" -ForegroundColor Yellow
Write-Host "  Shell access:    " -NoNewline; Write-Host "docker-compose exec backend sh" -ForegroundColor Yellow
Write-Host ""

# Show logs if requested
if ($Logs) {
    Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Green
    docker-compose logs -f
}
