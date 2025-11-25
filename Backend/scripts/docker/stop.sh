#!/bin/bash
##############################################################################
# Docker Stop Script
# WhatsApp SaaS Platform
#
# Usage: ./scripts/docker/stop.sh [dev|prod] [--clean]
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

ENV=${1:-dev}
CLEAN_FLAG=""

if [[ "$2" == "--clean" ]] || [[ "$1" == "--clean" ]]; then
  CLEAN_FLAG="-v"
fi

echo -e "${BLUE}Stopping WhatsApp SaaS containers...${NC}"

if [[ "$ENV" == "prod" ]]; then
  echo -e "${YELLOW}Stopping production environment${NC}"
  docker-compose -f docker-compose.prod.yml down $CLEAN_FLAG
else
  echo -e "${YELLOW}Stopping development environment${NC}"
  docker-compose down $CLEAN_FLAG
fi

echo -e "${GREEN}Containers stopped${NC}"

if [[ -n "$CLEAN_FLAG" ]]; then
  echo -e "${YELLOW}Volumes removed${NC}"
fi
