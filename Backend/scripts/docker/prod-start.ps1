##############################################################################
# Docker Production Environment Startup Script (PowerShell)
# WhatsApp SaaS Platform
#
# Usage: .\scripts\docker\prod-start.ps1 [-Build] [-Logs]
#
# Parameters:
#   -Build        Force rebuild of containers
#   -Logs         Show logs after starting
##############################################################################

param(
    [switch]$Build,
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
Write-Host "WhatsApp SaaS - Production Environment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Production deployment requires environment configuration." -ForegroundColor Red
    Write-Host ""
    Write-Host "Create .env file from template:" -ForegroundColor Yellow
    Write-Host "  Copy-Item .env.production.example .env"
    Write-Host "  # Edit .env with production secrets"
    Write-Host ""
    exit 1
}

# Validate required environment variables
Write-Host "Validating environment configuration..." -ForegroundColor Yellow
$RequiredVars = @(
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "ADMIN_TOKEN"
)

$MissingVars = @()
$EnvContent = Get-Content ".env" -Raw

foreach ($var in $RequiredVars) {
    if (-not ($EnvContent -match "^$var=.+$")) {
        $MissingVars += $var
    }
}

if ($MissingVars.Count -gt 0) {
    Write-Host "ERROR: Missing or invalid required environment variables:" -ForegroundColor Red
    foreach ($var in $MissingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please set all required variables in .env file." -ForegroundColor Yellow
    exit 1
}

Write-Host "Environment configuration validated" -ForegroundColor Green
Write-Host ""

# Check SSL certificates
if (-not (Test-Path "./ssl/cert.pem") -or -not (Test-Path "./ssl/key.pem")) {
    Write-Host "WARNING: SSL certificates not found!" -ForegroundColor Red
    Write-Host "Production requires SSL certificates in ./ssl/ directory" -ForegroundColor Yellow
    Write-Host "Expected files:" -ForegroundColor Yellow
    Write-Host "  - ./ssl/cert.pem"
    Write-Host "  - ./ssl/key.pem"
    Write-Host ""
    $continue = Read-Host "Continue without SSL? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Build flags
$BuildFlag = if ($Build) { "--build" } else { "" }

# Pull latest images (if not building)
if (-not $Build) {
    Write-Host "Pulling latest images..." -ForegroundColor Green
    docker-compose -f docker-compose.prod.yml pull
    Write-Host ""
}

# Start containers
Write-Host "Starting production containers..." -ForegroundColor Green
$cmd = "docker-compose -f docker-compose.prod.yml up -d $BuildFlag"
Invoke-Expression $cmd

# Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check health
Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml ps

# Run migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Production environment is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Blue
Write-Host "  HTTPS:        " -NoNewline; Write-Host "https://localhost" -ForegroundColor Green
Write-Host "  HTTP:         " -NoNewline; Write-Host "http://localhost (redirects to HTTPS)" -ForegroundColor Green
Write-Host "  Health Check: " -NoNewline; Write-Host "https://localhost/health" -ForegroundColor Green
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Blue
Write-Host "  View logs:       " -NoNewline; Write-Host "docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
Write-Host "  Stop services:   " -NoNewline; Write-Host "docker-compose -f docker-compose.prod.yml down" -ForegroundColor Yellow
Write-Host "  Restart backend: " -NoNewline; Write-Host "docker-compose -f docker-compose.prod.yml restart backend" -ForegroundColor Yellow
Write-Host "  Shell access:    " -NoNewline; Write-Host "docker-compose -f docker-compose.prod.yml exec backend sh" -ForegroundColor Yellow
Write-Host ""

# Show logs if requested
if ($Logs) {
    Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Green
    docker-compose -f docker-compose.prod.yml logs -f
}
