#!/bin/bash
# Build project and deploy with FRESH volumes (deletes all data)
# Usage: ./scripts/build-deploy-fresh.sh
#
# WARNING: This will delete all database data and Redis cache!

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== WARNING: This will DELETE all data (PostgreSQL, Redis) ==="
read -p "Are you sure? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "=== Building Maven project ==="
cd backend && ./mvnw clean package -DskipTests && cd ..

echo ""
echo "=== Stopping and removing all containers and volumes ==="
docker-compose --profile full-stack down -v

echo ""
echo "=== Building Docker image ==="
docker-compose build app

echo ""
echo "=== Starting services with fresh volumes ==="
docker-compose --profile full-stack up -d

echo ""
echo "=== Fresh deployment complete ==="
echo "App running at: http://localhost:8080"
echo "Swagger UI: http://localhost:8080/swagger-ui.html"
echo ""
echo "View logs: docker-compose logs -f app"
