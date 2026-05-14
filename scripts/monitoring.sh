#!/bin/bash
# Manage monitoring stack (Prometheus, Loki, Promtail, Grafana)
# Usage: ./scripts/monitoring.sh [--prod] {start|stop|restart|status|logs}
#
# Uses a separate project name (-p monitoring) to avoid conflicts
# with the main app stack sharing the same Docker network.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="monitoring"

# Check for --prod flag
ENV="local"
if [ "${1:-}" = "--prod" ]; then
    ENV="prod"
    shift
fi

if [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="$PROJECT_DIR/monitoring/docker-compose.prod.yml"
    # Detect names from production compose project directory
    APP_PROJECT="$(basename "$PROJECT_DIR")"
    NETWORK_NAME="${APP_PROJECT}_testcreator-network"
    VOLUME_NAME="${APP_PROJECT}_app_logs"
    # Export for docker-compose.prod.yml variable substitution
    export APP_NETWORK="$NETWORK_NAME"
    export APP_LOGS_VOLUME="$VOLUME_NAME"
    # Load .env for GF_ADMIN_PASSWORD
    if [ -f "$PROJECT_DIR/.env" ]; then
        set -a
        source "$PROJECT_DIR/.env"
        set +a
    fi
else
    COMPOSE_FILE="$PROJECT_DIR/monitoring/docker-compose.yml"
    NETWORK_NAME="test-creator_testcreator-network"
fi

cd "$PROJECT_DIR"

# Ensure the app network exists (created by main docker-compose.yml)
ensure_network() {
    if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
        echo "ERROR: Network '$NETWORK_NAME' not found."
        if [ "$ENV" = "prod" ]; then
            echo "Start the production stack first: ./scripts/deploy-prod.sh"
        else
            echo "Start the main stack first: docker compose up -d"
        fi
        exit 1
    fi
}

start() {
    ensure_network

    if [ "$ENV" = "prod" ]; then
        # Verify app_logs volume exists
        if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
            echo "ERROR: Volume '$VOLUME_NAME' not found."
            echo "Start the production app first: ./scripts/deploy-prod.sh"
            exit 1
        fi
    fi

    echo "=== Starting monitoring stack ($ENV) ==="
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    echo ""
    echo "=== Monitoring stack started ==="

    if [ "$ENV" = "prod" ]; then
        echo "Grafana:    http://127.0.0.1:3000  (bound to localhost only)"
        echo "Prometheus: http://127.0.0.1:9090  (bound to localhost only)"
        echo "Loki:       http://127.0.0.1:3100  (bound to localhost only)"
        echo ""
        echo "Access from your machine via SSH tunnel:"
        echo "  ssh -L 3000:127.0.0.1:3000 user@your-server"
    else
        echo "Grafana:    http://localhost:3000  (admin/admin)"
        echo "Prometheus: http://localhost:9090"
        echo "Loki:       http://localhost:3100"
    fi
    echo ""
    echo "Grafana datasources: Loki=http://loki:3100  Prometheus=http://prometheus:9090"
}

stop() {
    echo "=== Stopping monitoring stack ($ENV) ==="
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    echo "=== Monitoring stack stopped ==="
}

restart() {
    stop
    echo ""
    start
}

status() {
    echo "=== Monitoring stack status ($ENV) ==="
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
}

logs() {
    # Pass any extra args (e.g., service name) to docker compose logs
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f "${@:2}"
}

case "${1:-}" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    logs)    logs "$@" ;;
    *)
        echo "Usage: $0 [--prod] {start|stop|restart|status|logs}"
        echo ""
        echo "Options:"
        echo "  --prod     Use production configuration"
        echo ""
        echo "Commands:"
        echo "  start      Start all monitoring services"
        echo "  stop       Stop all monitoring services"
        echo "  restart    Restart all monitoring services"
        echo "  status     Show status of monitoring containers"
        echo "  logs       Tail logs (optionally: logs grafana, logs loki)"
        echo ""
        echo "Examples:"
        echo "  $0 start             # Start local monitoring"
        echo "  $0 --prod start      # Start production monitoring"
        echo "  $0 --prod logs loki  # Tail Loki logs in production"
        exit 1
        ;;
esac
