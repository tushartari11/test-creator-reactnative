#!/bin/bash
# Shutdown Docker containers without removing volumes/data
# Usage: ./scripts/shutdown.sh          # stop only (containers can be restarted quickly)
#        ./scripts/shutdown.sh --remove  # stop + remove containers (volumes preserved)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

REMOVE_CONTAINERS=false
if [[ "$1" == "--remove" ]]; then
    REMOVE_CONTAINERS=true
fi

echo "=== Stopping Docker containers ==="
echo "Note: Volumes and database data will be preserved"
echo ""

if [[ "$REMOVE_CONTAINERS" == true ]]; then
    echo "=== Stopping and removing all containers (volumes preserved) ==="
    docker-compose --profile full-stack down
else
    echo "=== Stopping all services (containers kept, use --remove to also remove them) ==="
    docker-compose --profile full-stack stop
fi

echo ""
echo "=== Current container status ==="
docker-compose ps

echo ""
echo "=== Shutdown complete ==="
echo "Volumes preserved:"
echo "  - postgres_data (database)"
echo "  - redis_data (cache)"
echo ""
if [[ "$REMOVE_CONTAINERS" == true ]]; then
    echo "Containers removed. To restart: ./scripts/build-deploy.sh"
else
    echo "To restart: docker-compose --profile full-stack up -d"
    echo "To restart with rebuild: ./scripts/build-deploy.sh"
    echo "Note: If you need a fresh deploy next, run: ./scripts/shutdown.sh --remove first"
fi
