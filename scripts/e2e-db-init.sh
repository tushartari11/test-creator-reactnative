#!/usr/bin/env bash
#
# Creates the isolated database used by the E2E test suite.
# Safe to run repeatedly — does nothing if the DB already exists.
#
# Required env vars (defaults shown):
#   DB_HOST       (localhost)
#   DB_PORT       (5432)
#   DB_USERNAME   (testcreator_user)
#   DB_PASSWORD   (changeme)
#   E2E_DB_NAME   (testcreator_e2e)
#
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-testcreator_user}"
DB_PASSWORD="${DB_PASSWORD:-changeme}"
E2E_DB_NAME="${E2E_DB_NAME:-testcreator_e2e}"

if [[ ! "${E2E_DB_NAME}" == *_e2e ]]; then
  echo "Refusing to create '${E2E_DB_NAME}' — name must end with '_e2e' as a safety guard." >&2
  exit 1
fi

echo "→ Creating database '${E2E_DB_NAME}' on ${DB_HOST}:${DB_PORT} if missing..."

PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres \
  -tc "SELECT 1 FROM pg_database WHERE datname='${E2E_DB_NAME}'" \
  | grep -q 1 \
  || PGPASSWORD="${DB_PASSWORD}" psql \
      -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres \
      -c "CREATE DATABASE ${E2E_DB_NAME}"

echo "✓ Database '${E2E_DB_NAME}' ready. Flyway will apply migrations on first Spring Boot startup with the 'e2e' profile."
