#!/bin/bash
# Restore PostgreSQL database from backup
# Usage: ./scripts/restore-db.sh [--prod] [backup_file|latest]
#
# Examples:
#   ./scripts/restore-db.sh                         # List local backups
#   ./scripts/restore-db.sh latest                  # Restore latest local backup
#   ./scripts/restore-db.sh backups/file.sql        # Restore specific file
#   ./scripts/restore-db.sh --prod                  # List production backups
#   ./scripts/restore-db.sh --prod latest           # Restore latest production backup

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Check for --prod flag
ENV="local"
if [ "${1:-}" = "--prod" ]; then
    ENV="prod"
    shift
fi

if [ "$ENV" = "prod" ]; then
    # Load credentials from .env
    if [ -f "$PROJECT_DIR/.env" ]; then
        set -a
        source "$PROJECT_DIR/.env"
        set +a
    else
        echo "ERROR: .env file not found. Required for production credentials."
        exit 1
    fi
    DB_USER="${DB_USERNAME}"
    DB_NAME_VAR="${DB_NAME}"
    BACKUP_PATTERN="testcreator_prod_*.sql"
else
    DB_USER="testcreator_user"
    DB_NAME_VAR="testcreator"
    BACKUP_PATTERN="testcreator_*.sql"
fi

# Check if postgres container is running
if ! docker ps --filter "name=testcreator-postgres" --filter "status=running" -q | grep -q .; then
    echo "ERROR: PostgreSQL container is not running."
    if [ "$ENV" = "prod" ]; then
        echo "Start it with: ./scripts/deploy-prod.sh"
    else
        echo "Start it with: docker compose up -d postgres"
    fi
    exit 1
fi

# No argument — list available backups
if [ -z "$1" ]; then
    echo "=== Available backups ($ENV) ==="
    if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/$BACKUP_PATTERN 1>/dev/null 2>&1; then
        ls -lh "$BACKUP_DIR"/$BACKUP_PATTERN
        echo ""
        echo "Usage:"
        echo "  ./scripts/restore-db.sh $([ "$ENV" = "prod" ] && echo "--prod ")latest"
        echo "  ./scripts/restore-db.sh $([ "$ENV" = "prod" ] && echo "--prod ")<backup_file>"
    else
        echo "No backups found in $BACKUP_DIR"
    fi
    exit 0
fi

# Determine backup file
if [ "$1" = "latest" ]; then
    if [ "$ENV" = "prod" ]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/testcreator_prod_*.sql 2>/dev/null | head -1)
    else
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/testcreator_*.sql 2>/dev/null | grep -v "_prod_" | head -1)
    fi
    if [ -z "$BACKUP_FILE" ]; then
        echo "ERROR: No backups found for $ENV environment"
        exit 1
    fi
elif [ -f "$1" ]; then
    BACKUP_FILE="$1"
elif [ -f "$BACKUP_DIR/$1" ]; then
    BACKUP_FILE="$BACKUP_DIR/$1"
else
    echo "ERROR: Backup file not found: $1"
    exit 1
fi

echo "=== WARNING: This will REPLACE all data in the $ENV database ==="
echo "Backup file: $BACKUP_FILE"
echo "Database:    $DB_NAME_VAR"
echo ""
read -p "Are you sure? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "=== Stopping app to prevent writes during restore ==="
if [ "$ENV" = "prod" ]; then
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" stop app || true
else
    docker compose -f "$PROJECT_DIR/docker-compose.yml" --profile full-stack stop app || true
fi

echo ""
echo "=== Restoring database ==="

# Drop and recreate schema to ensure clean restore
docker exec testcreator-postgres psql \
    -U "$DB_USER" \
    -d "$DB_NAME_VAR" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore from backup
docker exec -i testcreator-postgres psql \
    -U "$DB_USER" \
    -d "$DB_NAME_VAR" \
    < "$BACKUP_FILE"

echo ""
echo "=== Database restored successfully ==="
echo "Restored from: $BACKUP_FILE"
echo ""

# Restart app
echo "=== Restarting app ==="
if [ "$ENV" = "prod" ]; then
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" start app
else
    docker compose -f "$PROJECT_DIR/docker-compose.yml" --profile full-stack start app || true
fi

echo "=== Done ==="
