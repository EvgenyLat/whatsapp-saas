#!/bin/bash

# WhatsApp SaaS Platform - Database Setup Script
# Bash script for Git Bash / WSL / Linux
# Run this script to set up PostgreSQL and run migrations

set -e  # Exit on error

# Color output functions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Parse arguments
SKIP_DOCKER_CHECK=false
WITH_TOOLS=false
RESET=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-docker-check) SKIP_DOCKER_CHECK=true ;;
        --with-tools) WITH_TOOLS=true ;;
        --reset) RESET=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Configuration
BACKEND_DIR="C:/whatsapp-saas-starter/backend"
COMPOSE_FILE="docker-compose.db.yml"
DB_NAME="whatsapp_saas"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"
CONTAINER_NAME="whatsapp-saas-postgres-dev"

info "WhatsApp SaaS Platform - Database Setup"
info "========================================"
echo ""

# Step 1: Check prerequisites
info "Step 1: Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js is installed: $NODE_VERSION"
else
    error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm is installed: v$NPM_VERSION"
else
    error "npm is not installed. Please reinstall Node.js"
    exit 1
fi

# Check Docker (unless skipped)
if [ "$SKIP_DOCKER_CHECK" = false ]; then
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        success "Docker is installed: $DOCKER_VERSION"
    else
        warning "Docker is not installed"
        info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
        info "Or run this script with --skip-docker-check to see alternative setup options"
        exit 1
    fi

    # Check if Docker is running
    if docker ps &> /dev/null; then
        success "Docker is running"
    else
        error "Docker is not running. Please start Docker Desktop"
        exit 1
    fi
fi

echo ""

# Step 2: Navigate to backend directory
info "Step 2: Navigating to backend directory..."
cd "$BACKEND_DIR" || exit 1
success "Working directory: $(pwd)"
echo ""

# Step 3: Check if database is already running
info "Step 3: Checking existing database..."
EXISTING_CONTAINER=$(docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" 2>/dev/null || echo "")

if [ "$EXISTING_CONTAINER" = "$CONTAINER_NAME" ]; then
    CONTAINER_STATUS=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>/dev/null || echo "")

    if [ "$RESET" = true ]; then
        warning "Reset flag detected. Stopping and removing existing container..."
        docker-compose -f "$COMPOSE_FILE" down -v
        success "Container removed"
    elif [ -n "$CONTAINER_STATUS" ]; then
        warning "Database container is already running: $CONTAINER_STATUS"
        info "Use --reset flag to recreate the database (WARNING: This will delete all data)"
        read -p "Do you want to continue with existing database? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Setup cancelled"
            exit 0
        fi
    else
        info "Starting existing container..."
        docker start "$CONTAINER_NAME"
        success "Container started"
    fi
else
    info "No existing database found"
fi

echo ""

# Step 4: Start database services
if [ -z "$EXISTING_CONTAINER" ] || [ "$RESET" = true ]; then
    info "Step 4: Starting database services..."

    if [ "$WITH_TOOLS" = true ]; then
        info "Starting with management tools (Adminer, pgAdmin, Redis Commander)..."
        docker-compose -f "$COMPOSE_FILE" --profile tools up -d
    else
        info "Starting PostgreSQL and Redis..."
        docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    fi

    success "Database services started"

    # Wait for database to be ready
    info "Waiting for database to be ready..."
    MAX_ATTEMPTS=30
    ATTEMPT=0

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."

        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            echo ""
            success "Database is ready!"
            break
        fi

        sleep 2

        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            echo ""
            error "Database failed to become healthy after $MAX_ATTEMPTS attempts"
            info "Checking logs..."
            docker logs "$CONTAINER_NAME" --tail 50
            exit 1
        fi
    done
else
    info "Step 4: Using existing database..."
fi

echo ""

# Step 5: Verify DATABASE_URL
info "Step 5: Verifying DATABASE_URL configuration..."
ENV_FILE=".env.development"
EXPECTED_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

if [ -f "$ENV_FILE" ]; then
    CURRENT_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)

    if [ "$CURRENT_URL" = "$EXPECTED_URL" ]; then
        success "DATABASE_URL is correctly configured"
    else
        warning "DATABASE_URL mismatch"
        info "Expected: $EXPECTED_URL"
        info "Current:  $CURRENT_URL"

        read -p "Update DATABASE_URL? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$EXPECTED_URL|" "$ENV_FILE"
            success "DATABASE_URL updated"
        fi
    fi
else
    warning "$ENV_FILE not found"
fi

echo ""

# Step 6: Generate Prisma Client
info "Step 6: Generating Prisma Client..."
if npx prisma generate; then
    success "Prisma Client generated"
else
    error "Failed to generate Prisma Client"
    exit 1
fi

echo ""

# Step 7: Run migrations
info "Step 7: Running database migrations..."
if [ "$RESET" = true ]; then
    warning "Resetting database and running migrations..."
    if npx prisma migrate reset --force; then
        success "Database reset and migrations completed"
    else
        error "Failed to reset database"
        exit 1
    fi
else
    if npx prisma migrate dev --name init; then
        success "Database migrations completed"
    else
        error "Failed to run migrations"
        exit 1
    fi
fi

echo ""

# Step 8: Verify tables
info "Step 8: Verifying database tables..."
QUERY="SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"

TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$QUERY" 2>/dev/null || echo "")

if [ -n "$TABLES" ]; then
    success "Database tables created:"
    echo "$TABLES" | while read -r table; do
        if [ -n "$(echo "$table" | tr -d '[:space:]')" ]; then
            echo "  - $(echo "$table" | xargs)"
        fi
    done
else
    warning "No tables found"
fi

echo ""

# Step 9: Display connection information
success "Database setup completed successfully!"
echo ""
info "Connection Information:"
echo "  Database:  $DB_NAME"
echo "  Host:      $DB_HOST"
echo "  Port:      $DB_PORT"
echo "  User:      $DB_USER"
echo "  Password:  $DB_PASSWORD"
echo ""
info "Connection String:"
echo "  $EXPECTED_URL"
echo ""

# Display management URLs if tools are running
if [ "$WITH_TOOLS" = true ]; then
    info "Management Tools:"
    echo "  Adminer:         http://localhost:8080"
    echo "  pgAdmin:         http://localhost:5050 (admin@whatsapp-saas.local / admin)"
    echo "  Redis Commander: http://localhost:8081"
    echo ""
fi

info "Useful Commands:"
echo "  Open Prisma Studio:     npx prisma studio"
echo "  View DB logs:           docker logs -f $CONTAINER_NAME"
echo "  Stop database:          docker-compose -f $COMPOSE_FILE down"
echo "  Start database:         docker-compose -f $COMPOSE_FILE up -d"
echo "  Restart database:       docker restart $CONTAINER_NAME"
echo "  Connect to DB:          docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo ""
success "Setup complete! You can now start the backend application."
