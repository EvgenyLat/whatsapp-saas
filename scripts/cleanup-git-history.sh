#!/bin/bash

# ============================================================================
# Git History Cleanup Script
# ============================================================================
#
# This script removes sensitive files from git history using BFG Repo-Cleaner.
# IMPORTANT: This rewrites git history. Coordinate with your team before running!
#
# Prerequisites:
# - BFG Repo-Cleaner installed
# - Full backup of repository
# - All team members have committed and pushed changes
#
# Usage:
#   ./scripts/cleanup-git-history.sh
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FILES_TO_REMOVE=(
    "Backend/env.example"
)

PATTERNS_FILE="secrets-to-remove.txt"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}======================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================================================
# Safety Checks
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository"
        exit 1
    fi
    print_success "Git repository detected"

    # Check if BFG is installed
    if ! command -v bfg &> /dev/null; then
        print_error "BFG Repo-Cleaner not found"
        echo ""
        echo "Install BFG:"
        echo "  macOS:   brew install bfg"
        echo "  Windows: choco install bfg-repo-cleaner"
        echo "  Linux:   Download from https://rtyley.github.io/bfg-repo-cleaner/"
        echo ""
        exit 1
    fi
    print_success "BFG Repo-Cleaner installed"

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "You have uncommitted changes"
        echo ""
        echo "Please commit or stash your changes before running this script:"
        echo "  git add ."
        echo "  git commit -m 'commit message'"
        echo "or"
        echo "  git stash"
        echo ""
        exit 1
    fi
    print_success "No uncommitted changes"
}

create_backup() {
    print_header "Creating Backup"

    local backup_dir="../backups"
    local backup_name="whatsapp-saas-backup-$(date +%Y%m%d-%H%M%S)"

    mkdir -p "$backup_dir"

    print_info "Creating git bundle backup..."
    git bundle create "$backup_dir/$backup_name.bundle" --all

    print_info "Creating file system backup..."
    cp -r . "$backup_dir/$backup_name"

    print_success "Backup created: $backup_dir/$backup_name"
    echo ""
    print_warning "Keep this backup safe! You can restore from it if needed:"
    echo "  git clone $backup_dir/$backup_name.bundle restored-repo"
    echo ""
}

confirm_action() {
    print_warning "⚠️  WARNING ⚠️"
    echo ""
    echo "This script will PERMANENTLY rewrite git history!"
    echo ""
    echo "Before proceeding, ensure:"
    echo "  1. ✓ You have created a backup"
    echo "  2. ✓ All team members have committed and pushed"
    echo "  3. ✓ You understand this cannot be easily undone"
    echo "  4. ✓ You have revoked any exposed secrets"
    echo ""
    echo "Files that will be removed from ALL commits:"
    for file in "${FILES_TO_REMOVE[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Secret patterns that will be replaced:"
    echo "  - OpenAI API keys (sk-proj-*)"
    echo "  - Database credentials in connection strings"
    echo "  - Redis credentials"
    echo ""

    read -p "Do you want to continue? Type 'YES' to proceed: " confirmation

    if [ "$confirmation" != "YES" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
}

# ============================================================================
# Cleanup Functions
# ============================================================================

create_patterns_file() {
    print_info "Creating patterns file for secret replacement..."

    cat > "$PATTERNS_FILE" <<EOF
# Replace OpenAI API keys
sk-proj-==>REMOVED_API_KEY

# Replace AWS keys
AKIA==>REMOVED_AWS_KEY

# Generic replacements
password@==>PLACEHOLDER_PASSWORD@
:password==>:PLACEHOLDER_PASSWORD
EOF

    print_success "Patterns file created"
}

run_bfg_cleanup() {
    print_header "Running BFG Repo-Cleaner"

    # Remove specific files
    print_info "Removing files from history..."
    for file in "${FILES_TO_REMOVE[@]}"; do
        print_info "  Removing: $file"
        bfg --delete-files "$(basename "$file")" .
    done

    # Replace text patterns
    print_info "Replacing secret patterns in all files..."
    bfg --replace-text "$PATTERNS_FILE" .

    print_success "BFG cleanup complete"
}

cleanup_refs() {
    print_header "Cleaning up Git References"

    print_info "Expiring reflog..."
    git reflog expire --expire=now --all

    print_info "Running garbage collection..."
    git gc --prune=now --aggressive

    print_success "Git cleanup complete"
}

verify_cleanup() {
    print_header "Verifying Cleanup"

    local verification_failed=0

    # Check for sensitive patterns
    print_info "Checking for remaining secrets..."

    if git log -S "sk-proj-" --all --oneline | grep -q .; then
        print_error "OpenAI keys still found in history"
        verification_failed=1
    else
        print_success "No OpenAI keys found"
    fi

    # Check for specific files
    for file in "${FILES_TO_REMOVE[@]}"; do
        if git log --all --full-history -- "$file" | grep -q .; then
            print_error "File still in history: $file"
            verification_failed=1
        else
            print_success "File removed: $file"
        fi
    done

    return $verification_failed
}

# ============================================================================
# Post-Cleanup Actions
# ============================================================================

show_next_steps() {
    print_header "Cleanup Complete!"

    echo ""
    print_success "Git history has been cleaned"
    echo ""

    print_warning "IMPORTANT NEXT STEPS:"
    echo ""

    echo "1. Verify the cleanup:"
    echo "   ./scripts/verify-secret-removal.sh"
    echo ""

    echo "2. Test your application:"
    echo "   - Ensure all features still work"
    echo "   - Check that nothing was accidentally removed"
    echo ""

    echo "3. Update the remote repository (COORDINATE WITH TEAM):"
    echo ""
    echo "   ⚠️  This will rewrite history on the remote repository!"
    echo "   ⚠️  All team members must delete and re-clone!"
    echo ""
    echo "   git push --force --all origin"
    echo "   git push --force --tags origin"
    echo ""

    echo "4. Notify team members:"
    echo "   - Tell them to delete their local repository"
    echo "   - Have them clone fresh from remote"
    echo "   - Example commands:"
    echo "     cd .."
    echo "     rm -rf whatsapp-saas-starter"
    echo "     git clone https://github.com/your-org/whatsapp-saas-starter.git"
    echo ""

    echo "5. Verify on GitHub/GitLab:"
    echo "   - Check that secrets are not visible in web UI"
    echo "   - Review secret scanning alerts"
    echo "   - Mark exposed secrets as revoked"
    echo ""

    echo "6. Security measures:"
    echo "   - Revoke any exposed API keys (if not already done)"
    echo "   - Enable GitHub/GitLab secret scanning"
    echo "   - Install pre-commit hooks:"
    echo "     cp .github/hooks/pre-commit .git/hooks/pre-commit"
    echo "     chmod +x .git/hooks/pre-commit"
    echo ""

    print_info "For detailed instructions, see SECURITY_FIX.md"
    echo ""
}

# ============================================================================
# Main Flow
# ============================================================================

main() {
    print_header "Git History Cleanup Script"

    echo ""
    print_info "This script uses BFG Repo-Cleaner to remove secrets from git history"
    echo ""

    # Safety checks
    check_prerequisites

    # Create backup
    create_backup

    # Get confirmation
    confirm_action

    # Create patterns file
    create_patterns_file

    # Run BFG
    run_bfg_cleanup

    # Clean up refs
    cleanup_refs

    # Verify
    if ! verify_cleanup; then
        print_warning "Verification found some issues"
        print_info "Review the output above and run manual checks"
    fi

    # Clean up temp files
    rm -f "$PATTERNS_FILE"

    # Show next steps
    show_next_steps
}

# ============================================================================
# Run main function
# ============================================================================

main "$@"
