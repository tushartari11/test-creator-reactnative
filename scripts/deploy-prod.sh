#!/bin/bash
# Build and deploy to production (Hetzner CX23 VPS — Docker Compose only, no orchestration)
# Usage: ./scripts/deploy-prod.sh
#
# Runs on the VPS: builds the app inside Docker (no Java/Maven needed on the server),
# then starts all services (PostgreSQL, Redis, App).

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found."
    echo "Run: cp .env.example .env && nano .env"
    exit 1
fi

echo "=== Building and deploying (production) ==="
echo ""

echo "=== Stopping existing app container ==="
docker compose -f docker-compose.prod.yml stop app || true
docker compose -f docker-compose.prod.yml rm -f app || true

echo ""
echo "=== Building Docker image (includes Maven build) ==="
docker compose -f docker-compose.prod.yml build app

echo ""
echo "=== Starting all services ==="
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Waiting for health check ==="
sleep 10

if docker compose -f docker-compose.prod.yml ps app | grep -q "healthy\|running"; then
    echo ""
    echo "=== Deployment successful ==="
    echo "App running at: http://$(hostname -I | awk '{print $1}'):8080"
    echo ""
    echo "View logs: docker compose -f docker-compose.prod.yml logs -f app"
else
    echo ""
    echo "=== WARNING: App may still be starting ==="
    echo "Check logs: docker compose -f docker-compose.prod.yml logs -f app"
fi
