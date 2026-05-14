#!/usr/bin/env bash
#
# Builds the Expo web bundle (if missing) and copies it into the Spring Boot
# static folder, so a single Spring Boot process serves both the SPA and the
# REST API at http://localhost:8080.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="${ROOT}/frontend"
DIST="${FRONTEND}/dist"
STATIC="${ROOT}/backend/src/main/resources/static"

if [[ ! -d "${DIST}" ]]; then
  echo "→ dist/ missing — running 'npm run export:web' in ${FRONTEND}"
  (cd "${FRONTEND}" && npm run export:web)
fi

echo "→ Syncing ${DIST}/ → ${STATIC}/"
mkdir -p "${STATIC}"
# Preserve favicon.ico and any non-Expo assets at the destination root; only
# wipe Expo-managed artefacts we know about.
rm -rf "${STATIC}/_expo" "${STATIC}/index.html" "${STATIC}/+not-found.html" "${STATIC}/modal.html" "${STATIC}/_sitemap.html"
cp -R "${DIST}/." "${STATIC}/"

echo "✓ Frontend bundle copied. Start Spring Boot in e2e mode:"
echo "    cd backend && SPRING_PROFILES_ACTIVE=e2e ./mvnw spring-boot:run"
