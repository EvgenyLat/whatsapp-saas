#!/bin/bash
##############################################################################
# Docker Database Backup Script
# WhatsApp SaaS Platform
#
# Usage: ./scripts/docker/backup.sh [dev|prod]
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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Backup - $ENV${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [[ "$ENV" == "prod" ]]; then
  COMPOSE_FILE="-f docker-compose.prod.yml"
  BACKUP_FILE="$BACKUP_DIR/backup_prod_${TIMESTAMP}.sql"
else
  COMPOSE_FILE=""
  BACKUP_FILE="$BACKUP_DIR/backup_dev_${TIMESTAMP}.sql"
fi

echo -e "${YELLOW}Creating backup: $BACKUP_FILE${NC}"

# Create backup
docker-compose $COMPOSE_FILE exec -T postgres pg_dump -U postgres whatsapp_saas > "$BACKUP_FILE"

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_FILE"

echo -e "${GREEN}Backup created: ${BACKUP_FILE}.gz${NC}"
echo -e "${GREEN}Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)${NC}"
echo ""
echo -e "${BLUE}To restore this backup:${NC}"
echo -e "  gunzip ${BACKUP_FILE}.gz"
echo -e "  cat ${BACKUP_FILE} | docker-compose $COMPOSE_FILE exec -T postgres psql -U postgres whatsapp_saas"
