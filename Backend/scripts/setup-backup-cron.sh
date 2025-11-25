#!/bin/bash

################################################################################
# Crontab Setup Script for Database Backups
################################################################################
#
# Description: Configures automated backup schedule using cron
#
# Usage: sudo ./setup-backup-cron.sh [OPTIONS]
#
# Options:
#   --install    Install cron jobs
#   --remove     Remove cron jobs
#   --show       Show current cron jobs
#   --test       Test backup scripts
#
################################################################################

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"
readonly CRON_MARKER="# WhatsApp SaaS Database Backups"

# Backup schedule
# Daily: Every day at 3:00 AM UTC
# Weekly: Every Sunday at 2:00 AM UTC
# Monthly: First day of month at 1:00 AM UTC
readonly DAILY_SCHEDULE="0 3 * * *"
readonly WEEKLY_SCHEDULE="0 2 * * 0"
readonly MONTHLY_SCHEDULE="0 1 1 * *"

################################################################################
# FUNCTIONS
################################################################################

log_info() {
    echo "[INFO] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

error_exit() {
    log_error "$1"
    exit "${2:-1}"
}

# Check if running as root (required for crontab modification)
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Verify backup script exists and is executable
verify_backup_script() {
    if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
        error_exit "Backup script not found: ${BACKUP_SCRIPT}" 1
    fi

    if [[ ! -x "${BACKUP_SCRIPT}" ]]; then
        log_info "Making backup script executable..."
        chmod +x "${BACKUP_SCRIPT}"
    fi

    log_info "Backup script verified: ${BACKUP_SCRIPT}"
}

# Generate environment variable loader
generate_env_loader() {
    local env_file="${SCRIPT_DIR}/../.env"
    local env_loader=""

    if [[ -f "${env_file}" ]]; then
        env_loader="source ${env_file} && "
    fi

    echo "${env_loader}"
}

# Install cron jobs
install_cron() {
    local env_loader
    local temp_cron

    log_info "Installing backup cron jobs..."

    # Generate environment loader
    env_loader=$(generate_env_loader)

    # Create temporary crontab file
    temp_cron=$(mktemp)

    # Get current crontab (if exists)
    crontab -l > "${temp_cron}" 2>/dev/null || true

    # Remove existing backup jobs (if any)
    sed -i "/${CRON_MARKER}/,+5d" "${temp_cron}" 2>/dev/null || true

    # Add backup jobs
    cat >> "${temp_cron}" <<EOF

${CRON_MARKER}
# Daily backup at 3:00 AM UTC
${DAILY_SCHEDULE} ${env_loader}${BACKUP_SCRIPT} --daily >> /var/log/backups.log 2>&1

# Weekly backup at 2:00 AM UTC on Sunday
${WEEKLY_SCHEDULE} ${env_loader}${BACKUP_SCRIPT} --weekly >> /var/log/backups.log 2>&1

# Monthly backup at 1:00 AM UTC on the 1st
${MONTHLY_SCHEDULE} ${env_loader}${BACKUP_SCRIPT} --monthly >> /var/log/backups.log 2>&1
EOF

    # Install new crontab
    if crontab "${temp_cron}"; then
        log_info "Cron jobs installed successfully"
        log_info ""
        log_info "Schedule:"
        log_info "  Daily:   Every day at 3:00 AM UTC"
        log_info "  Weekly:  Every Sunday at 2:00 AM UTC"
        log_info "  Monthly: First day of month at 1:00 AM UTC"
    else
        rm -f "${temp_cron}"
        error_exit "Failed to install cron jobs" 1
    fi

    rm -f "${temp_cron}"
}

# Remove cron jobs
remove_cron() {
    local temp_cron

    log_info "Removing backup cron jobs..."

    # Create temporary crontab file
    temp_cron=$(mktemp)

    # Get current crontab
    if ! crontab -l > "${temp_cron}" 2>/dev/null; then
        log_info "No existing crontab found"
        rm -f "${temp_cron}"
        return 0
    fi

    # Remove backup jobs
    sed -i "/${CRON_MARKER}/,+5d" "${temp_cron}" 2>/dev/null || true

    # Install modified crontab
    if crontab "${temp_cron}"; then
        log_info "Cron jobs removed successfully"
    else
        rm -f "${temp_cron}"
        error_exit "Failed to remove cron jobs" 1
    fi

    rm -f "${temp_cron}"
}

# Show current cron jobs
show_cron() {
    log_info "Current backup cron jobs:"
    echo ""

    if ! crontab -l 2>/dev/null | grep -A 5 "${CRON_MARKER}"; then
        log_info "No backup cron jobs found"
    fi

    echo ""
}

# Test backup scripts
test_scripts() {
    log_info "Testing backup scripts..."
    echo ""

    # Test daily backup (dry run)
    log_info "Testing daily backup (dry run)..."
    if "${BACKUP_SCRIPT}" --daily --dry-run --verbose; then
        log_info "✓ Daily backup test passed"
    else
        log_error "✗ Daily backup test failed"
    fi

    echo ""

    # Test weekly backup (dry run)
    log_info "Testing weekly backup (dry run)..."
    if "${BACKUP_SCRIPT}" --weekly --dry-run --verbose; then
        log_info "✓ Weekly backup test passed"
    else
        log_error "✗ Weekly backup test failed"
    fi

    echo ""

    # Test monthly backup (dry run)
    log_info "Testing monthly backup (dry run)..."
    if "${BACKUP_SCRIPT}" --monthly --dry-run --verbose; then
        log_info "✓ Monthly backup test passed"
    else
        log_error "✗ Monthly backup test failed"
    fi

    echo ""
    log_info "All tests complete"
}

# Display usage
usage() {
    cat <<EOF
Usage: sudo $0 [OPTIONS]

Options:
  --install    Install cron jobs for automated backups
  --remove     Remove backup cron jobs
  --show       Show current backup cron jobs
  --test       Test backup scripts (dry run)
  --help       Display this help message

Examples:
  # Install backup cron jobs
  sudo $0 --install

  # Test backup scripts before installing
  sudo $0 --test

  # Show current schedule
  sudo $0 --show

  # Remove backup cron jobs
  sudo $0 --remove
EOF
}

################################################################################
# MAIN
################################################################################

main() {
    local action="${1:-}"

    if [[ -z "${action}" ]]; then
        usage
        exit 0
    fi

    case "${action}" in
        --install)
            check_root
            verify_backup_script
            install_cron
            ;;
        --remove)
            check_root
            remove_cron
            ;;
        --show)
            show_cron
            ;;
        --test)
            verify_backup_script
            test_scripts
            ;;
        --help|-h)
            usage
            ;;
        *)
            log_error "Unknown option: ${action}"
            usage
            exit 1
            ;;
    esac
}

main "$@"
