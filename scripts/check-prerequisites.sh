#!/bin/bash

################################################################################
# Prerequisites Check Script
# Verifies all required tools are installed for AWS deployment
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Prerequisites Check for AWS Deployment               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check Terraform
echo -n "Checking Terraform... "
if command -v terraform &> /dev/null; then
    VERSION=$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n1 | cut -d'v' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${RED}✗${NC} Not found"
    echo "  Install: https://www.terraform.io/downloads"
    ERRORS=$((ERRORS + 1))
fi

# Check AWS CLI
echo -n "Checking AWS CLI... "
if command -v aws &> /dev/null; then
    VERSION=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${RED}✗${NC} Not found"
    echo "  Install: https://aws.amazon.com/cli/"
    ERRORS=$((ERRORS + 1))
fi

# Check jq
echo -n "Checking jq... "
if command -v jq &> /dev/null; then
    VERSION=$(jq --version 2>&1 | cut -d'-' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${RED}✗${NC} Not found"
    echo "  Install: https://stedolan.github.io/jq/download/"
    ERRORS=$((ERRORS + 1))
fi

# Check AWS credentials
echo -n "Checking AWS credentials... "
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    USER=$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)
    echo -e "${GREEN}✓${NC} Configured"
    echo "  Account: ${ACCOUNT}"
    echo "  User: ${USER}"
else
    echo -e "${RED}✗${NC} Not configured"
    echo "  Run: aws configure"
    ERRORS=$((ERRORS + 1))
fi

# Check AWS region
echo -n "Checking AWS region... "
REGION=$(aws configure get region 2>/dev/null || echo "")
if [ -n "$REGION" ]; then
    echo -e "${GREEN}✓${NC} ${REGION}"
else
    echo -e "${YELLOW}⚠${NC} Not set (will use us-east-1)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Git
echo -n "Checking Git... "
if command -v git &> /dev/null; then
    VERSION=$(git --version | cut -d' ' -f3)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (optional)"
    echo "  Install: https://git-scm.com/"
    WARNINGS=$((WARNINGS + 1))
fi

# Check curl
echo -n "Checking curl... "
if command -v curl &> /dev/null; then
    VERSION=$(curl --version | head -n1 | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (optional)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check psql (optional)
echo -n "Checking PostgreSQL client... "
if command -v psql &> /dev/null; then
    VERSION=$(psql --version | cut -d' ' -f3)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (optional, for testing)"
    echo "  Install: apt-get install postgresql-client"
    WARNINGS=$((WARNINGS + 1))
fi

# Check redis-cli (optional)
echo -n "Checking Redis client... "
if command -v redis-cli &> /dev/null; then
    VERSION=$(redis-cli --version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (optional, for testing)"
    echo "  Install: apt-get install redis-tools"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Node.js (for application)
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node --version | cut -d'v' -f2)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (needed for application)"
    echo "  Install: https://nodejs.org/"
    WARNINGS=$((WARNINGS + 1))
fi

# Check npm (for application)
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} Installed (v${VERSION})"
else
    echo -e "${YELLOW}⚠${NC} Not found (needed for application)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "════════════════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All required tools are installed!${NC}"

    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNINGS} optional tool(s) missing${NC}"
    fi

    echo ""
    echo "You can now run:"
    echo "  ./scripts/deploy-aws.sh"
    echo ""
    exit 0
else
    echo -e "${RED}✗ ${ERRORS} required tool(s) missing${NC}"

    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNINGS} optional tool(s) missing${NC}"
    fi

    echo ""
    echo "Please install missing tools before deploying."
    echo ""
    exit 1
fi
