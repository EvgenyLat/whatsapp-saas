#!/bin/bash
##############################################################################
# Docker Production Environment Startup Script
# WhatsApp SaaS Platform
#
# Usage: ./scripts/docker/prod-start.sh [options]
#
# Options:
#   --build       Force rebuild of containers
#   --logs        Show logs after starting
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
BUILD_FLAG=""
LOGS_FLAG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --logs)
      LOGS_FLAG=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}WhatsApp SaaS - Production Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}ERROR: .env file not found!${NC}"
  echo -e "${RED}Production deployment requires environment configuration.${NC}"
  echo ""
  echo -e "${YELLOW}Create .env file from template:${NC}"
  echo -e "  cp .env.production.example .env"
  echo -e "  # Edit .env with production secrets"
  echo ""
  exit 1
fi

# Validate required environment variables
echo -e "${YELLOW}Validating environment configuration...${NC}"
REQUIRED_VARS=(
  "POSTGRES_PASSWORD"
  "REDIS_PASSWORD"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "ADMIN_TOKEN"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=.*change.*production" .env; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo -e "${RED}ERROR: Missing or invalid required environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo -e "  ${RED}- $var${NC}"
  done
  echo ""
  echo -e "${YELLOW}Please set all required variables in .env file.${NC}"
  exit 1
fi

echo -e "${GREEN}Environment configuration validated${NC}"
echo ""

# Check SSL certificates
if [ ! -f "./ssl/cert.pem" ] || [ ! -f "./ssl/key.pem" ]; then
  echo -e "${RED}WARNING: SSL certificates not found!${NC}"
  echo -e "${YELLOW}Production requires SSL certificates in ./ssl/ directory${NC}"
  echo -e "${YELLOW}Expected files:${NC}"
  echo -e "  - ./ssl/cert.pem"
  echo -e "  - ./ssl/key.pem"
  echo ""
  echo -e "${YELLOW}Generate self-signed certificates for testing:${NC}"
  echo -e "  mkdir -p ssl"
  echo -e "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo -e "    -keyout ssl/key.pem -out ssl/cert.pem"
  echo ""
  read -p "Continue without SSL? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Pull latest images (if not building)
if [ -z "$BUILD_FLAG" ]; then
  echo -e "${GREEN}Pulling latest images...${NC}"
  docker-compose -f docker-compose.prod.yml pull
  echo ""
fi

# Start containers
echo -e "${GREEN}Starting production containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d $BUILD_FLAG

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check health
echo ""
echo -e "${GREEN}Checking service health...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Run migrations
echo ""
echo -e "${GREEN}Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Production environment is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  HTTPS:        ${GREEN}https://localhost${NC}"
echo -e "  HTTP:         ${GREEN}http://localhost${NC} (redirects to HTTPS)"
echo -e "  Health Check: ${GREEN}https://localhost/health${NC}"
echo ""
echo -e "${BLUE}Container Status:${NC}"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:       ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Stop services:   ${YELLOW}docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "  Restart backend: ${YELLOW}docker-compose -f docker-compose.prod.yml restart backend${NC}"
echo -e "  Shell access:    ${YELLOW}docker-compose -f docker-compose.prod.yml exec backend sh${NC}"
echo -e "  Database backup: ${YELLOW}./scripts/docker/backup.sh${NC}"
echo ""

# Show logs if requested
if [ "$LOGS_FLAG" = true ]; then
  echo -e "${GREEN}Showing logs (Ctrl+C to exit)...${NC}"
  docker-compose -f docker-compose.prod.yml logs -f
fi
