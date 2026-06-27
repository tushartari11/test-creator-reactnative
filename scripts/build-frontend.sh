#!/usr/bin/env bash
# Rebuild the Expo web bundle with .env.production and copy it into
# backend/src/main/resources/static/ so the Docker image picks it up.
#
# Run locally before committing, or on the VPS before deploy-prod.sh
# (requires Node.js >= 18 and npm).
#
# Usage:
#   ./scripts/build-frontend.sh              # uses .env.production
#   APP_ENV=staging ./scripts/build-frontend.sh  # override env file (unused by Expo — kept for docs)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
STATIC_DIR="${PROJECT_DIR}/backend/src/main/resources/static"
NVMRC_VERSION="$(cat "${FRONTEND_DIR}/.nvmrc")"

echo "=== Loading Node.js ${NVMRC_VERSION} via nvm ==="
# Source nvm — handle both login shells and CI-style environments
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    echo "ERROR: nvm not found at ${NVM_DIR}. Install nvm first: https://github.com/nvm-sh/nvm"
    exit 1
fi
# shellcheck source=/dev/null
source "${NVM_DIR}/nvm.sh"
nvm install "${NVMRC_VERSION}"
nvm use "${NVMRC_VERSION}"

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
echo "  node: ${NODE_VERSION}"
echo "  npm:  $(npm --version)"

echo ""
echo "=== Installing frontend dependencies ==="
cd "${FRONTEND_DIR}"
npm ci --prefer-offline

echo ""
echo "=== Building Expo web export (production) ==="
# Expo automatically picks up .env.production when NODE_ENV=production
NODE_ENV=production npx expo export --platform web

echo ""
echo "=== Copying bundle to Spring Boot static folder ==="
mkdir -p "${STATIC_DIR}"
# Remove only Expo-managed artefacts; preserve any hand-placed assets (favicon, etc.)
rm -rf \
    "${STATIC_DIR}/_expo" \
    "${STATIC_DIR}/index.html" \
    "${STATIC_DIR}/+not-found.html" \
    "${STATIC_DIR}/modal.html" \
    "${STATIC_DIR}/_sitemap.html"
cp -R "${FRONTEND_DIR}/dist/." "${STATIC_DIR}/"

echo ""
echo "=== Done ==="
echo "  Bundle API URL: $(grep -o 'EXPO_PUBLIC_API_URL=.*' "${FRONTEND_DIR}/.env.production" || echo '(not found)')"
echo "  Static dir:     ${STATIC_DIR}"
echo ""
echo "Next steps:"
echo "  Local → commit → push → CI/CD deploys automatically"
echo "  VPS   → ./scripts/deploy-prod.sh   (rebuilds Docker image)"
