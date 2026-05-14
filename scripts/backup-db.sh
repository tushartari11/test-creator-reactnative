#!/bin/bash
# Backup PostgreSQL database
# Usage: ./scripts/backup-db.sh [--prod]
#
# Creates a timestamped SQL dump in the backups/ directory.
# Keeps the last 10 backups, removes older ones.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check for --prod flag
ENV="local"
if [ "${1:-}" = "--prod" ]; then
    ENV="prod"
    shift
fi

if [ "$ENV" = "prod" ]; then
    COMPOSE_CMD="docker compose -f $PROJECT_DIR/docker-compose.prod.yml"
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
    BACKUP_FILE="$BACKUP_DIR/testcreator_prod_$TIMESTAMP.sql"
else
    COMPOSE_CMD="docker compose -f $PROJECT_DIR/docker-compose.yml"
    DB_USER="testcreator_user"
    DB_NAME_VAR="testcreator"
    BACKUP_FILE="$BACKUP_DIR/testcreator_$TIMESTAMP.sql"
fi

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=== Backing up PostgreSQL database ($ENV) ==="

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

# Create backup using custom format for better compression, with plain SQL fallback
docker exec testcreator-postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME_VAR" \
    --no-owner \
    --no-privileges \
    > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Backup created: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

    # Keep only last 10 backups per environment
    cd "$BACKUP_DIR"
    if [ "$ENV" = "prod" ]; then
        ls -t testcreator_prod_*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f
    else
        ls -t testcreator_*.sql 2>/dev/null | grep -v "_prod_" | tail -n +11 | xargs -r rm -f
    fi

    echo ""
    echo "Recent backups:"
    ls -lh testcreator_*.sql 2>/dev/null | head -5
else
    echo "ERROR: Backup failed or file is empty"
    rm -f "$BACKUP_FILE"
    exit 1
fi
