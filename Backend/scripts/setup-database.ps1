# WhatsApp SaaS Platform - Database Setup Script
# PowerShell script for Windows environment
# Run this script to set up PostgreSQL and run migrations

param(
    [switch]$SkipDockerCheck,
    [switch]$WithTools,
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Success { param($Message) Write-Host "[✓] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[✗] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[i] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[!] $Message" -ForegroundColor Yellow }

# Configuration
$BACKEND_DIR = "C:\whatsapp-saas-starter\backend"
$COMPOSE_FILE = "docker-compose.db.yml"
$DB_NAME = "whatsapp_saas"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$CONTAINER_NAME = "whatsapp-saas-postgres-dev"

Write-Info "WhatsApp SaaS Platform - Database Setup"
Write-Info "========================================"
Write-Host ""

# Step 1: Check prerequisites
Write-Info "Step 1: Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js is installed: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Success "npm is installed: v$npmVersion"
} catch {
    Write-Error "npm is not installed. Please reinstall Node.js"
    exit 1
}

# Check Docker (unless skipped)
if (-not $SkipDockerCheck) {
    try {
        $dockerVersion = docker --version
        Write-Success "Docker is installed: $dockerVersion"
    } catch {
        Write-Warning "Docker is not installed"
        Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
        Write-Info "Or run this script with -SkipDockerCheck to see alternative setup options"
        exit 1
    }

    # Check if Docker is running
    try {
        docker ps | Out-Null
        Write-Success "Docker is running"
    } catch {
        Write-Error "Docker is not running. Please start Docker Desktop"
        exit 1
    }
}

Write-Host ""

# Step 2: Navigate to backend directory
Write-Info "Step 2: Navigating to backend directory..."
Set-Location $BACKEND_DIR
Write-Success "Working directory: $(Get-Location)"
Write-Host ""

# Step 3: Check if database is already running
Write-Info "Step 3: Checking existing database..."
$existingContainer = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" 2>$null

if ($existingContainer -eq $CONTAINER_NAME) {
    $containerStatus = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>$null

    if ($Reset) {
        Write-Warning "Reset flag detected. Stopping and removing existing container..."
        docker-compose -f $COMPOSE_FILE down -v
        Write-Success "Container removed"
    } elseif ($containerStatus) {
        Write-Warning "Database container is already running: $containerStatus"
        Write-Info "Use -Reset flag to recreate the database (WARNING: This will delete all data)"
        $continue = Read-Host "Do you want to continue with existing database? (y/n)"
        if ($continue -ne 'y') {
            Write-Info "Setup cancelled"
            exit 0
        }
    } else {
        Write-Info "Starting existing container..."
        docker start $CONTAINER_NAME
        Write-Success "Container started"
    }
} else {
    Write-Info "No existing database found"
}

Write-Host ""

# Step 4: Start database services
if (-not $existingContainer -or $Reset) {
    Write-Info "Step 4: Starting database services..."

    if ($WithTools) {
        Write-Info "Starting with management tools (Adminer, pgAdmin, Redis Commander)..."
        docker-compose -f $COMPOSE_FILE --profile tools up -d
    } else {
        Write-Info "Starting PostgreSQL and Redis..."
        docker-compose -f $COMPOSE_FILE up -d postgres redis
    }

    Write-Success "Database services started"

    # Wait for database to be ready
    Write-Info "Waiting for database to be ready..."
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        $attempt++
        Write-Host "." -NoNewline

        $healthStatus = docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>$null

        if ($healthStatus -eq 'healthy') {
            Write-Host ""
            Write-Success "Database is ready!"
            break
        }

        Start-Sleep -Seconds 2

        if ($attempt -eq $maxAttempts) {
            Write-Host ""
            Write-Error "Database failed to become healthy after $maxAttempts attempts"
            Write-Info "Checking logs..."
            docker logs $CONTAINER_NAME --tail 50
            exit 1
        }
    }
} else {
    Write-Info "Step 4: Using existing database..."
}

Write-Host ""

# Step 5: Verify DATABASE_URL
Write-Info "Step 5: Verifying DATABASE_URL configuration..."
$envFile = ".env.development"
$expectedUrl = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw

    if ($envContent -match "DATABASE_URL=(.+)") {
        $currentUrl = $matches[1].Trim()

        if ($currentUrl -eq $expectedUrl) {
            Write-Success "DATABASE_URL is correctly configured"
        } else {
            Write-Warning "DATABASE_URL mismatch"
            Write-Info "Expected: $expectedUrl"
            Write-Info "Current:  $currentUrl"

            $update = Read-Host "Update DATABASE_URL? (y/n)"
            if ($update -eq 'y') {
                $envContent = $envContent -replace "DATABASE_URL=.+", "DATABASE_URL=$expectedUrl"
                Set-Content -Path $envFile -Value $envContent
                Write-Success "DATABASE_URL updated"
            }
        }
    } else {
        Write-Warning "DATABASE_URL not found in $envFile"
    }
} else {
    Write-Warning "$envFile not found"
}

Write-Host ""

# Step 6: Generate Prisma Client
Write-Info "Step 6: Generating Prisma Client..."
try {
    npx prisma generate
    Write-Success "Prisma Client generated"
} catch {
    Write-Error "Failed to generate Prisma Client"
    Write-Error $_.Exception.Message
    exit 1
}

Write-Host ""

# Step 7: Run migrations
Write-Info "Step 7: Running database migrations..."
try {
    if ($Reset) {
        Write-Warning "Resetting database and running migrations..."
        npx prisma migrate reset --force
    } else {
        npx prisma migrate dev --name init
    }
    Write-Success "Database migrations completed"
} catch {
    Write-Error "Failed to run migrations"
    Write-Error $_.Exception.Message
    exit 1
}

Write-Host ""

# Step 8: Verify tables
Write-Info "Step 8: Verifying database tables..."
$query = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"

try {
    $tables = docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c $query 2>$null

    if ($tables) {
        Write-Success "Database tables created:"
        $tableArray = $tables -split "`n" | Where-Object { $_.Trim() -ne "" }
        foreach ($table in $tableArray) {
            Write-Host "  - $($table.Trim())" -ForegroundColor Gray
        }
    } else {
        Write-Warning "No tables found"
    }
} catch {
    Write-Warning "Could not verify tables: $($_.Exception.Message)"
}

Write-Host ""

# Step 9: Display connection information
Write-Success "Database setup completed successfully!"
Write-Host ""
Write-Info "Connection Information:"
Write-Host "  Database:  $DB_NAME" -ForegroundColor Gray
Write-Host "  Host:      $DB_HOST" -ForegroundColor Gray
Write-Host "  Port:      $DB_PORT" -ForegroundColor Gray
Write-Host "  User:      $DB_USER" -ForegroundColor Gray
Write-Host "  Password:  $DB_PASSWORD" -ForegroundColor Gray
Write-Host ""
Write-Info "Connection String:"
Write-Host "  $expectedUrl" -ForegroundColor Gray
Write-Host ""

# Display management URLs if tools are running
if ($WithTools) {
    Write-Info "Management Tools:"
    Write-Host "  Adminer:         http://localhost:8080" -ForegroundColor Gray
    Write-Host "  pgAdmin:         http://localhost:5050 (admin@whatsapp-saas.local / admin)" -ForegroundColor Gray
    Write-Host "  Redis Commander: http://localhost:8081" -ForegroundColor Gray
    Write-Host ""
}

Write-Info "Useful Commands:"
Write-Host "  Open Prisma Studio:     npx prisma studio" -ForegroundColor Gray
Write-Host "  View DB logs:           docker logs -f $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "  Stop database:          docker-compose -f $COMPOSE_FILE down" -ForegroundColor Gray
Write-Host "  Start database:         docker-compose -f $COMPOSE_FILE up -d" -ForegroundColor Gray
Write-Host "  Restart database:       docker restart $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "  Connect to DB:          docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME" -ForegroundColor Gray
Write-Host ""
Write-Success "Setup complete! You can now start the backend application."
