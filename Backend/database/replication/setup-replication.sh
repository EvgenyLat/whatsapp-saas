#!/bin/bash

################################################################################
# PostgreSQL Streaming Replication Setup
# WhatsApp SaaS Starter - High Availability Configuration
#
# This script sets up:
# - Primary-Replica streaming replication
# - Automatic failover with Patroni (optional)
# - Replication monitoring
# - Health checks
#
# Architecture:
#   Primary (Read/Write) -> Replica 1 (Read)
#                        -> Replica 2 (Read)
#
# Usage:
#   ./setup-replication.sh [primary|replica] [replica-name]
################################################################################

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

ROLE="${1:-primary}"
REPLICA_NAME="${2:-replica1}"

# Primary server configuration
PRIMARY_HOST="${PRIMARY_HOST:-primary.db.internal}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
PRIMARY_USER="${PRIMARY_USER:-replicator}"
PRIMARY_PASSWORD="${PRIMARY_PASSWORD:-change_me}"

# Replica configuration
REPLICA_HOST="${REPLICA_HOST:-$(hostname)}"
REPLICA_PORT="${REPLICA_PORT:-5432}"

# PostgreSQL configuration
PG_VERSION="${PG_VERSION:-15}"
PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
PG_CONFIG_DIR="/etc/postgresql/${PG_VERSION}/main"

# Replication settings
MAX_WAL_SENDERS="${MAX_WAL_SENDERS:-10}"
WAL_KEEP_SIZE="${WAL_KEEP_SIZE:-1GB}"
MAX_REPLICATION_SLOTS="${MAX_REPLICATION_SLOTS:-10}"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if PostgreSQL is installed
    if ! command -v psql >/dev/null 2>&1; then
        error "PostgreSQL is not installed"
    fi

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi

    log "Prerequisites check completed"
}

setup_primary() {
    log "Setting up PRIMARY server..."

    # Stop PostgreSQL if running
    systemctl stop postgresql || true

    # Configure postgresql.conf for replication
    log "Configuring postgresql.conf..."
    cat >> "${PG_CONFIG_DIR}/postgresql.conf" <<EOF

# ============================================================================
# REPLICATION CONFIGURATION - Added by setup-replication.sh
# ============================================================================

# Enable replication
wal_level = replica
max_wal_senders = ${MAX_WAL_SENDERS}
max_replication_slots = ${MAX_REPLICATION_SLOTS}
wal_keep_size = ${WAL_KEEP_SIZE}

# Archive WAL files for point-in-time recovery
archive_mode = on
archive_command = 'test ! -f /var/backups/postgresql/wal_archive/%f && cp %p /var/backups/postgresql/wal_archive/%f'

# Synchronous replication (optional - uncomment for zero data loss)
# synchronous_commit = on
# synchronous_standby_names = '${REPLICA_NAME}'

# Performance tuning for replication
hot_standby = on
hot_standby_feedback = on
wal_receiver_status_interval = 10s
wal_receiver_timeout = 60s

# Connection settings
listen_addresses = '*'
max_connections = 200

# Memory settings (adjust based on available RAM)
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%m [%p] %q%u@%d '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
log_lock_waits = on
log_statement = 'ddl'
log_replication_commands = on

EOF

    # Configure pg_hba.conf for replication
    log "Configuring pg_hba.conf..."
    cat >> "${PG_CONFIG_DIR}/pg_hba.conf" <<EOF

# Replication connections - Added by setup-replication.sh
host    replication     ${PRIMARY_USER}     0.0.0.0/0               scram-sha-256
host    replication     ${PRIMARY_USER}     ::/0                    scram-sha-256

# Application connections
host    all             all                 0.0.0.0/0               scram-sha-256
host    all             all                 ::/0                    scram-sha-256

EOF

    # Create replication user
    log "Creating replication user..."
    systemctl start postgresql

    sudo -u postgres psql <<EOF
-- Create replication user
CREATE USER ${PRIMARY_USER} WITH REPLICATION ENCRYPTED PASSWORD '${PRIMARY_PASSWORD}';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE whatsapp_saas TO ${PRIMARY_USER};

-- Create replication slot for each replica
SELECT pg_create_physical_replication_slot('${REPLICA_NAME}_slot');

EOF

    # Create WAL archive directory
    mkdir -p /var/backups/postgresql/wal_archive
    chown postgres:postgres /var/backups/postgresql/wal_archive

    # Restart PostgreSQL
    systemctl restart postgresql

    log "Primary server setup completed"
    log "Replication user: ${PRIMARY_USER}"
    log "Replication slot: ${REPLICA_NAME}_slot"
}

setup_replica() {
    log "Setting up REPLICA server: ${REPLICA_NAME}..."

    # Stop PostgreSQL if running
    systemctl stop postgresql || true

    # Backup existing data directory
    if [[ -d "${PG_DATA_DIR}" ]]; then
        log "Backing up existing data directory..."
        mv "${PG_DATA_DIR}" "${PG_DATA_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Create new data directory
    mkdir -p "${PG_DATA_DIR}"
    chown postgres:postgres "${PG_DATA_DIR}"

    # Create .pgpass for authentication
    log "Creating .pgpass file..."
    sudo -u postgres bash <<EOF
cat > ~/.pgpass <<PGPASS
${PRIMARY_HOST}:${PRIMARY_PORT}:replication:${PRIMARY_USER}:${PRIMARY_PASSWORD}
PGPASS
chmod 0600 ~/.pgpass
EOF

    # Perform base backup from primary
    log "Performing base backup from primary..."
    sudo -u postgres pg_basebackup \
        -h "${PRIMARY_HOST}" \
        -p "${PRIMARY_PORT}" \
        -U "${PRIMARY_USER}" \
        -D "${PG_DATA_DIR}" \
        -Fp -Xs -P -R \
        --slot="${REPLICA_NAME}_slot"

    if [[ $? -ne 0 ]]; then
        error "Base backup failed"
    fi

    # Configure replica-specific settings
    log "Configuring replica settings..."
    cat >> "${PG_DATA_DIR}/postgresql.auto.conf" <<EOF

# Replica-specific configuration
hot_standby = on
hot_standby_feedback = on
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${PRIMARY_USER} password=${PRIMARY_PASSWORD} application_name=${REPLICA_NAME}'
primary_slot_name = '${REPLICA_NAME}_slot'
promote_trigger_file = '/tmp/postgresql.trigger.${REPLICA_NAME}'

EOF

    # Set correct permissions
    chown -R postgres:postgres "${PG_DATA_DIR}"
    chmod 0700 "${PG_DATA_DIR}"

    # Start PostgreSQL
    systemctl start postgresql

    # Verify replication status
    log "Verifying replication status..."
    sleep 5

    sudo -u postgres psql -h localhost -p ${REPLICA_PORT} -c "SELECT pg_is_in_recovery();"

    log "Replica server setup completed"
    log "Replica name: ${REPLICA_NAME}"
    log "Connected to primary: ${PRIMARY_HOST}"
}

setup_monitoring() {
    log "Setting up replication monitoring..."

    # Create monitoring script
    cat > /usr/local/bin/check-replication-lag.sh <<'EOF'
#!/bin/bash

# Check replication lag on replica
if psql -h localhost -U postgres -t -c "SELECT pg_is_in_recovery();" | grep -q 't'; then
    LAG=$(psql -h localhost -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INTEGER;")
    echo "Replication lag: ${LAG} seconds"

    # Alert if lag > 60 seconds
    if [[ ${LAG} -gt 60 ]]; then
        echo "WARNING: Replication lag is high!"
        exit 1
    fi
else
    echo "This is the primary server"
fi

exit 0
EOF

    chmod +x /usr/local/bin/check-replication-lag.sh

    # Create systemd timer for monitoring
    cat > /etc/systemd/system/replication-monitor.service <<EOF
[Unit]
Description=PostgreSQL Replication Lag Monitor
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-replication-lag.sh
User=postgres

[Install]
WantedBy=multi-user.target
EOF

    cat > /etc/systemd/system/replication-monitor.timer <<EOF
[Unit]
Description=Run replication lag check every minute

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=replication-monitor.service

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable replication-monitor.timer
    systemctl start replication-monitor.timer

    log "Monitoring setup completed"
}

verify_replication() {
    log "Verifying replication setup..."

    if [[ "${ROLE}" == "primary" ]]; then
        # Check replication status on primary
        sudo -u postgres psql <<EOF
-- Show connected replicas
SELECT application_name, client_addr, state, sync_state, sync_priority
FROM pg_stat_replication;

-- Show replication slots
SELECT slot_name, slot_type, active, restart_lsn
FROM pg_replication_slots;

EOF
    else
        # Check replication status on replica
        sudo -u postgres psql <<EOF
-- Check if in recovery mode
SELECT pg_is_in_recovery();

-- Show replication lag
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INTEGER as lag_seconds;

-- Show receive and replay LSN
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();

EOF
    fi
}

setup_failover() {
    log "Setting up manual failover procedure..."

    cat > /usr/local/bin/promote-replica.sh <<'EOF'
#!/bin/bash
# Promote replica to primary

TRIGGER_FILE="/tmp/postgresql.trigger.$(hostname)"

echo "CAUTION: This will promote this replica to primary!"
read -p "Are you sure? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "Promotion cancelled"
    exit 0
fi

# Create trigger file to promote replica
touch "${TRIGGER_FILE}"

# Wait for promotion
sleep 5

# Verify promotion
if ! psql -h localhost -U postgres -t -c "SELECT pg_is_in_recovery();" | grep -q 'f'; then
    echo "ERROR: Promotion failed"
    exit 1
fi

echo "Replica successfully promoted to primary!"
echo "Remember to:"
echo "1. Update application connection strings"
echo "2. Reconfigure old primary as replica (if recovering)"
echo "3. Update DNS/load balancer"

exit 0
EOF

    chmod +x /usr/local/bin/promote-replica.sh

    log "Failover script created: /usr/local/bin/promote-replica.sh"
}

install_patroni() {
    log "Installing Patroni for automatic failover..."

    # Install Patroni
    apt-get update
    apt-get install -y python3-pip python3-etcd
    pip3 install patroni[etcd]

    # Create Patroni configuration
    cat > /etc/patroni/patroni.yml <<EOF
scope: whatsapp-saas-cluster
namespace: /db/
name: ${REPLICA_NAME}

restapi:
  listen: ${REPLICA_HOST}:8008
  connect_address: ${REPLICA_HOST}:8008

etcd:
  host: etcd.internal:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: on
        max_wal_senders: 10
        max_replication_slots: 10

postgresql:
  listen: ${REPLICA_HOST}:${REPLICA_PORT}
  connect_address: ${REPLICA_HOST}:${REPLICA_PORT}
  data_dir: ${PG_DATA_DIR}
  bin_dir: /usr/lib/postgresql/${PG_VERSION}/bin
  authentication:
    replication:
      username: ${PRIMARY_USER}
      password: ${PRIMARY_PASSWORD}
    superuser:
      username: postgres
      password: postgres_password

EOF

    # Create Patroni systemd service
    cat > /etc/systemd/system/patroni.service <<EOF
[Unit]
Description=Patroni (PostgreSQL HA)
After=syslog.target network.target

[Service]
Type=simple
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
TimeoutSec=30
Restart=no

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable patroni
    systemctl start patroni

    log "Patroni installed and configured"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log "==========================================="
    log "PostgreSQL Replication Setup"
    log "Role: ${ROLE}"
    log "==========================================="

    check_prerequisites

    case "${ROLE}" in
        primary)
            setup_primary
            setup_monitoring
            verify_replication
            ;;
        replica)
            setup_replica
            setup_monitoring
            verify_replication
            setup_failover
            ;;
        patroni)
            install_patroni
            ;;
        *)
            error "Invalid role: ${ROLE}. Use 'primary', 'replica', or 'patroni'"
            ;;
    esac

    log "==========================================="
    log "Replication setup completed successfully"
    log "==========================================="
}

main

exit 0
