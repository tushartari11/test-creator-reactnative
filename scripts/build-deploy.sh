#!/bin/bash
# Build project and deploy containers (preserves volumes/data)
# Usage: ./scripts/build-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Building Maven project ==="
./mvnw clean package -DskipTests

echo ""
echo "=== Building Docker image ==="
docker-compose build app

echo ""
echo "=== Stopping and removing existing app container ==="
docker-compose --profile full-stack stop app 2>/dev/null || true
docker-compose --profile full-stack rm -f app 2>/dev/null || true
docker rm -f testcreator-app 2>/dev/null || true

echo ""
echo "=== Starting services ==="
docker-compose --profile full-stack up -d

echo ""
echo "=== Deployment complete ==="
echo "App running at: http://localhost:8080"
echo "Swagger UI: http://localhost:8080/swagger-ui.html"
echo ""
echo "View logs: docker-compose logs -f app"