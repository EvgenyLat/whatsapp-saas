#!/bin/bash
##############################################################################
# Docker Development Environment Startup Script
# WhatsApp SaaS Platform
#
# Usage: ./scripts/docker/dev-start.sh [options]
#
# Options:
#   --build       Force rebuild of containers
#   --clean       Clean up volumes before starting
#   --tools       Start with Adminer database management tool
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
CLEAN_FLAG=false
TOOLS_FLAG=""
LOGS_FLAG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --clean)
      CLEAN_FLAG=true
      shift
      ;;
    --tools)
      TOOLS_FLAG="--profile tools"
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
echo -e "${BLUE}WhatsApp SaaS - Development Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Warning: .env file not found${NC}"
  echo -e "${YELLOW}Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}Created .env file. Please update with your credentials.${NC}"
  echo ""
fi

# Clean volumes if requested
if [ "$CLEAN_FLAG" = true ]; then
  echo -e "${YELLOW}Cleaning up volumes...${NC}"
  docker-compose down -v
  echo -e "${GREEN}Volumes cleaned${NC}"
  echo ""
fi

# Start containers
echo -e "${GREEN}Starting Docker containers...${NC}"
docker-compose up -d $BUILD_FLAG $TOOLS_FLAG

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Check health
echo ""
echo -e "${GREEN}Checking service health...${NC}"
docker-compose ps

# Run migrations
echo ""
echo -e "${GREEN}Running database migrations...${NC}"
docker-compose exec -T backend npx prisma migrate deploy || echo -e "${YELLOW}Migrations failed - may need manual intervention${NC}"

# Generate Prisma client
echo ""
echo -e "${GREEN}Generating Prisma client...${NC}"
docker-compose exec -T backend npx prisma generate || echo -e "${YELLOW}Prisma generate failed${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Development environment is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  Backend API:  ${GREEN}http://localhost:3000${NC}"
echo -e "  API Docs:     ${GREEN}http://localhost:3000/api/docs${NC}"
echo -e "  Health Check: ${GREEN}http://localhost:3000/api/v1/health${NC}"
echo -e "  PostgreSQL:   ${GREEN}localhost:5432${NC}"
echo -e "  Redis:        ${GREEN}localhost:6379${NC}"

if [ -n "$TOOLS_FLAG" ]; then
  echo -e "  Adminer:      ${GREEN}http://localhost:8080${NC}"
fi

echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:       ${YELLOW}docker-compose logs -f backend${NC}"
echo -e "  Stop services:   ${YELLOW}docker-compose down${NC}"
echo -e "  Restart backend: ${YELLOW}docker-compose restart backend${NC}"
echo -e "  Run tests:       ${YELLOW}docker-compose exec backend npm test${NC}"
echo -e "  Shell access:    ${YELLOW}docker-compose exec backend sh${NC}"
echo ""

# Show logs if requested
if [ "$LOGS_FLAG" = true ]; then
  echo -e "${GREEN}Showing logs (Ctrl+C to exit)...${NC}"
  docker-compose logs -f
fi
