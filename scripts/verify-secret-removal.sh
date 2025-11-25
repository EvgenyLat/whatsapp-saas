#!/bin/bash

# ============================================================================
# Git Secret Removal Verification Script
# ============================================================================
#
# This script verifies that sensitive secrets have been completely removed
# from git history after running cleanup procedures.
#
# Usage:
#   ./scripts/verify-secret-removal.sh
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
SENSITIVE_PATTERNS=(
    "sk-proj-"           # OpenAI API keys
    "OPENAI_API_KEY=sk"  # OpenAI key in env format
    "sk-[A-Za-z0-9]"     # Generic OpenAI key pattern
)

SENSITIVE_FILES=(
    "Backend/env.example"
    ".env"
    "Backend/.env"
)

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
# Verification Functions
# ============================================================================

check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository"
        print_info "This check is only needed if you're using git version control"
        exit 0
    fi
    print_success "Git repository detected"
}

check_file_in_history() {
    local file="$1"

    print_info "Checking file in history: $file"

    # Check if file exists in current commit
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        print_warning "File exists in current commit: $file"
        return 1
    fi

    # Check if file exists in any historical commit
    if git log --all --full-history --source --extra-refs -- "$file" | grep -q .; then
        print_error "File found in git history: $file"
        git log --all --full-history --oneline -- "$file" | head -5
        return 1
    else
        print_success "File not found in history: $file"
        return 0
    fi
}

check_pattern_in_history() {
    local pattern="$1"

    print_info "Searching for pattern: $pattern"

    # Search all commits for the pattern
    if git log -S "$pattern" --all --oneline | grep -q .; then
        print_error "Pattern found in git history: $pattern"
        echo ""
        echo "Commits containing pattern:"
        git log -S "$pattern" --all --oneline | head -10
        echo ""
        return 1
    else
        print_success "Pattern not found in history: $pattern"
        return 0
    fi
}

check_pattern_in_all_files() {
    local pattern="$1"

    print_info "Searching pattern in all tracked files: $pattern"

    # Get all file blobs from all commits
    if git grep "$pattern" $(git rev-list --all) 2>/dev/null | grep -q .; then
        print_error "Pattern found in repository history: $pattern"
        echo ""
        echo "Occurrences found:"
        git grep "$pattern" $(git rev-list --all) 2>/dev/null | head -10
        echo ""
        return 1
    else
        print_success "Pattern not found in any historical file: $pattern"
        return 0
    fi
}

check_branches() {
    print_info "Checking all branches..."

    local branches=$(git branch -a | grep -v HEAD)
    local found=0

    for branch in $branches; do
        echo "  Checking branch: $branch"

        for file in "${SENSITIVE_FILES[@]}"; do
            if git log "$branch" --oneline -- "$file" 2>/dev/null | grep -q .; then
                print_warning "File found in branch $branch: $file"
                found=1
            fi
        done
    done

    if [ $found -eq 0 ]; then
        print_success "No sensitive files found in any branch"
    fi

    return $found
}

check_reflog() {
    print_info "Checking reflog for sensitive data..."

    if git reflog | grep -i "env.example" | grep -q .; then
        print_warning "References to env.example found in reflog"
        print_info "Consider running: git reflog expire --expire=now --all"
        return 1
    else
        print_success "No references in reflog"
        return 0
    fi
}

check_current_files() {
    print_info "Checking current working directory..."

    local found=0

    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if grep -r "$pattern" Backend/env.example 2>/dev/null | grep -q .; then
            print_error "Sensitive pattern found in current files: $pattern"
            grep -r "$pattern" Backend/env.example
            found=1
        fi
    done

    if [ $found -eq 0 ]; then
        print_success "No sensitive patterns in current files"
    fi

    return $found
}

check_env_example_content() {
    print_info "Verifying env.example has placeholder values..."

    if [ -f "Backend/env.example" ]; then
        # Check if file contains actual API keys
        if grep -E "OPENAI_API_KEY=sk-proj-" Backend/env.example | grep -q .; then
            print_error "env.example contains actual API key!"
            return 1
        fi

        # Check if file contains placeholder
        if grep -E "OPENAI_API_KEY=.*your.*api.*key" Backend/env.example | grep -qi .; then
            print_success "env.example contains placeholder values"
            return 0
        else
            print_warning "env.example may not have proper placeholder"
            return 1
        fi
    else
        print_warning "Backend/env.example not found"
        return 1
    fi
}

# ============================================================================
# Main Verification Flow
# ============================================================================

main() {
    print_header "Git Secret Removal Verification"

    echo ""
    print_info "This script checks if secrets have been removed from git history"
    echo ""

    # Check if git repo
    check_git_repo

    local all_passed=0

    # Check each sensitive file
    print_header "Checking Files in History"
    for file in "${SENSITIVE_FILES[@]}"; do
        if ! check_file_in_history "$file"; then
            all_passed=1
        fi
    done

    # Check each sensitive pattern
    print_header "Checking Patterns in History"
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if ! check_pattern_in_history "$pattern"; then
            all_passed=1
        fi
    done

    # Deep search in all files
    print_header "Deep Search in All Files"
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if ! check_pattern_in_all_files "$pattern"; then
            all_passed=1
        fi
    done

    # Check all branches
    print_header "Checking All Branches"
    if ! check_branches; then
        all_passed=1
    fi

    # Check reflog
    print_header "Checking Reflog"
    if ! check_reflog; then
        all_passed=1
    fi

    # Check current files
    print_header "Checking Current Working Directory"
    if ! check_current_files; then
        all_passed=1
    fi

    # Check env.example content
    print_header "Verifying env.example Content"
    if ! check_env_example_content; then
        all_passed=1
    fi

    # Summary
    print_header "Verification Summary"

    echo ""
    if [ $all_passed -eq 0 ]; then
        print_success "All checks passed! No secrets found in git history."
        echo ""
        print_info "Your repository is clean and safe to push."
        echo ""
        exit 0
    else
        print_error "Some checks failed. Secrets may still exist in git history."
        echo ""
        print_warning "Next steps:"
        echo ""
        echo "1. If this is a new repository (no remote commits):"
        echo "   - Simply fix the current files"
        echo "   - No history cleanup needed"
        echo ""
        echo "2. If secrets are in git history:"
        echo "   - Run cleanup with BFG Repo-Cleaner (see SECURITY_FIX.md)"
        echo "   - Or use git filter-branch (slower, see SECURITY_FIX.md)"
        echo ""
        echo "3. After cleanup:"
        echo "   - Run this script again to verify"
        echo "   - Force push to remote (CAUTION: coordinate with team)"
        echo "   - Revoke exposed secrets immediately"
        echo ""
        exit 1
    fi
}

# ============================================================================
# Run main function
# ============================================================================

main "$@"
