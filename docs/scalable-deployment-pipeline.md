# Scalable CI/CD Deployment Pipeline

## Overview

This document covers the plan to introduce **separate, automated CI/CD pipelines** for the backend and
frontend, and to make both independently scalable on the existing DigitalOcean droplet.

The existing deployment model (SSH → `git pull` → `docker compose up --build`) is preserved — no
container registry is introduced. GitHub Actions automates that manual step via SSH, triggered
independently per service using path filters.

---

## Architecture

### Before

```
Internet (443)
     │
  Caddy ──── reverse_proxy localhost:8080
     │
  testcreator-app (Spring Boot — serves API + Expo static files)
     │
  postgres  redis
```

### After

```
Internet (443)
     │
  Caddy ──── reverse_proxy localhost:80          ← Caddyfile change
     │
  nginx-lb  (Docker container, 127.0.0.1:80)    ← NEW
     │
     ├── /api/  /actuator/  /swagger-ui/  /v3/api-docs/
     │       └──► backend:8080  [1…N replicas]  ← renamed from "app"
     │
     └── /  (everything else)
             └──► frontend:80  [1…N replicas]   ← NEW (Nginx + Expo web export)
     │
  postgres  redis  (unchanged)
```

### Docker Compose Services Summary

| Service    | Change                                          | Scalable |
|------------|-------------------------------------------------|----------|
| `postgres`  | unchanged, keeps `container_name`               | no (stateful) |
| `redis`     | unchanged, keeps `container_name`               | no (stateful) |
| `backend`   | renamed from `app`; no `container_name`; no `ports:` | **yes** |
| `frontend`  | NEW — Nginx container serving Expo web export   | **yes** |
| `nginx-lb`  | NEW — load balancer; owns `127.0.0.1:80:80`     | no (gateway) |

> Removing `container_name` and `ports:` from `backend` and `frontend` is what allows
> `docker compose up --scale backend=3` to work. The `nginx-lb` container uses Docker's embedded
> DNS resolver (`127.0.0.11`) to round-robin across all replicas automatically — no restart needed
> after scaling.

---

## Files Changed / Created

| File | Action | Notes |
|------|--------|-------|
| `frontend/Dockerfile` | **CREATE** | Multi-stage: Node builds Expo web export → Nginx serves it |
| `frontend/nginx-spa.conf` | **CREATE** | SPA routing config (index.html fallback) bundled in frontend image |
| `frontend/.env.production` | **MODIFY** | `EXPO_PUBLIC_API_URL` → `/api` (relative URL, domain-agnostic) |
| `nginx/nginx-lb.conf` | **CREATE** | Load balancer: routes `/api/` to backend, `/` to frontend |
| `docker-compose.prod.yml` | **MODIFY** | Add `frontend` + `nginx-lb` services; rename `app` → `backend`; remove port bindings |
| `.github/workflows/deploy-backend.yml` | **CREATE** | Path-filtered pipeline: test → SSH deploy backend only |
| `.github/workflows/deploy-frontend.yml` | **CREATE** | Path-filtered pipeline: type-check + export verify → SSH deploy frontend only |
| `/etc/caddy/Caddyfile` (on server) | **Manual step** | Change `localhost:8080` → `localhost:80` |

---

## File Contents

### `frontend/Dockerfile`

```dockerfile
# Stage 1: Build Expo web export
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_API_URL=/api
ARG EXPO_PUBLIC_APP_ENV=production
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_APP_ENV=${EXPO_PUBLIC_APP_ENV}
RUN npx expo export --platform web

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
```

`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_ENV` are baked into the JS bundle at build time by Expo's
Metro bundler. Passing them as `build.args` in `docker-compose.prod.yml` lets you override them
without editing the Dockerfile.

---

### `frontend/nginx-spa.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Static assets — long cache, immutable
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Expo-hashed asset bundle
    location /_expo/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback — expo-router client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### `nginx/nginx-lb.conf`

```nginx
server {
    listen 80;
    server_name _;

    # Docker's embedded DNS resolver.
    # Using set $var + proxy_pass http://$var:port forces per-request DNS
    # resolution, so nginx picks up new replicas after --scale without a restart.
    resolver 127.0.0.11 valid=5s ipv6=off;

    proxy_buffer_size        128k;
    proxy_buffers            4 256k;
    proxy_busy_buffers_size  256k;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Backend routes
    location /api/ {
        set $backend backend;
        proxy_pass http://$backend:8080;
        proxy_read_timeout 60s;
    }
    location /actuator/ {
        set $backend backend;
        proxy_pass http://$backend:8080;
    }
    location /swagger-ui/ {
        set $backend backend;
        proxy_pass http://$backend:8080;
    }
    location /v3/api-docs {
        set $backend backend;
        proxy_pass http://$backend:8080;
    }

    # Frontend SPA — everything else
    location / {
        set $frontend frontend;
        proxy_pass http://$frontend:80;
        proxy_read_timeout 30s;
    }
}
```

---

### `docker-compose.prod.yml` (full replacement)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: testcreator-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - testcreator-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: testcreator-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - testcreator-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Scalable — NO container_name, NO host ports binding
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      SPRING_PROFILES_ACTIVE: production
      DB_HOST: postgres
      DB_PORT: 5432
      REDIS_HOST: redis
      REDIS_PORT: 6379
      LOG_PATH: /app/logs
      JAVA_OPTS: >-
        -Xms512m -Xmx1024m
        -XX:+UseG1GC
        -XX:MaxGCPauseMillis=200
        -Djava.security.egd=file:/dev/./urandom
    volumes:
      - app_logs:/app/logs
    networks:
      - testcreator-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  # Scalable — NO container_name, NO host ports binding
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        EXPO_PUBLIC_API_URL: /api
        EXPO_PUBLIC_APP_ENV: production
    restart: unless-stopped
    networks:
      - testcreator-network
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "3"

  # Single instance — gateway; owns port 80
  nginx-lb:
    image: nginx:1.27-alpine
    container_name: testcreator-nginx-lb
    restart: unless-stopped
    depends_on:
      - backend
      - frontend
    ports:
      - "127.0.0.1:80:80"
    volumes:
      - ./nginx/nginx-lb.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - testcreator-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  app_logs:
    driver: local

networks:
  testcreator-network:
    driver: bridge
```

---

### `frontend/.env.production` (modified line)

```
EXPO_PUBLIC_API_URL=/api
EXPO_PUBLIC_APP_ENV=production
```

Changed from `http://167.71.60.139:8080/api` to `/api`. The relative URL works because nginx-lb
routes `/api/` to the backend on the same domain. This also makes the frontend Docker image
portable across domains and IPs.

---

### `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'docker-compose.prod.yml'
      - '.github/workflows/deploy-backend.yml'

concurrency:
  group: deploy-backend-${{ github.ref }}
  cancel-in-progress: false   # never cancel an in-flight deploy

jobs:
  test:
    name: Backend — Build & Test
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven
      - name: Build and test
        run: ./mvnw verify -B -Dspring.profiles.active=test
        env:
          SPRING_PROFILES_ACTIVE: test
      - name: Upload test reports on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: backend-test-reports-${{ github.run_number }}
          path: |
            backend/target/surefire-reports/
            backend/target/failsafe-reports/
          retention-days: 7

  deploy:
    name: Deploy Backend to Droplet
    runs-on: ubuntu-latest
    needs: test
    environment: production
    steps:
      - name: Deploy backend via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            set -euo pipefail
            cd ~/apps/test-creator
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build --no-deps backend
            attempt=0
            until docker compose -f docker-compose.prod.yml ps backend | grep -qE 'healthy|running'; do
              attempt=$((attempt + 1))
              [ $attempt -ge 20 ] && docker compose -f docker-compose.prod.yml logs --tail 50 backend && exit 1
              sleep 5
            done
            docker image prune -f
            echo "=== Backend deploy complete ==="
```

---

### `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'nginx/nginx-lb.conf'
      - 'docker-compose.prod.yml'
      - '.github/workflows/deploy-frontend.yml'

concurrency:
  group: deploy-frontend-${{ github.ref }}
  cancel-in-progress: false

jobs:
  verify:
    name: Frontend — TypeScript & Web Export
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: TypeScript check
        run: npx tsc --noEmit
      - name: Expo web export
        run: npx expo export --platform web
        env:
          EXPO_PUBLIC_APP_ENV: ci
          EXPO_PUBLIC_API_URL: http://localhost/api

  deploy:
    name: Deploy Frontend to Droplet
    runs-on: ubuntu-latest
    needs: verify
    environment: production
    steps:
      - name: Deploy frontend via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USER }}
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            set -euo pipefail
            cd ~/apps/test-creator
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend
            attempt=0
            until docker compose -f docker-compose.prod.yml ps frontend | grep -qE 'healthy|running'; do
              attempt=$((attempt + 1))
              [ $attempt -ge 15 ] && docker compose -f docker-compose.prod.yml logs --tail 50 frontend && exit 1
              sleep 5
            done
            docker image prune -f
            echo "=== Frontend deploy complete ==="
```

---

## One-Time Server Setup

These steps are performed once before the first automated deploy.

### 1. Generate a dedicated deploy SSH key (on your local machine)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
```

### 2. Authorize it on the droplet

```bash
ssh deploy@YOUR_DROPLET_IP
cat >> ~/.ssh/authorized_keys << 'EOF'
<paste contents of ~/.ssh/github_actions_deploy.pub here>
EOF
```

Verify connectivity:

```bash
ssh -i ~/.ssh/github_actions_deploy deploy@YOUR_DROPLET_IP echo "ok"
```

### 3. Add three GitHub repository secrets

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name  | Value |
|--------------|-------|
| `DO_HOST`    | Droplet IP or domain (e.g. `167.71.60.139`) |
| `DO_USER`    | `deploy` |
| `DO_SSH_KEY` | Full contents of `~/.ssh/github_actions_deploy` (the private key) |

### 4. Update Caddyfile on the server

```bash
sudo nano /etc/caddy/Caddyfile
```

Change:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

To:

```
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl reload caddy
```

---

## Migration Sequence (safe, avoids downtime)

Run the migration manually on the server first, verify it works, then let automated pipelines take
over from the next push.

```bash
# 1. Push all new files to main, then pull on the server
ssh deploy@YOUR_DROPLET_IP
cd ~/apps/test-creator
git pull origin main

# 2. Build and start the new stack
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify via localhost before touching Caddy
curl -s http://localhost/actuator/health | jq .
curl -s http://localhost/ | grep '<title>'
curl -s -o /dev/null -w "%{http_code}" http://localhost/swagger-ui/index.html   # expect 200

# 4. Switch Caddy (public-facing cutover — do this when you're happy with step 3)
sudo nano /etc/caddy/Caddyfile   # localhost:8080 → localhost:80
sudo systemctl reload caddy

# 5. Verify over HTTPS
curl -s https://yourdomain.com/actuator/health | jq .
```

---

## Scaling Commands

```bash
# Scale backend to 3 replicas
docker compose -f docker-compose.prod.yml up -d --scale backend=3 --no-recreate

# Scale frontend to 2 replicas
docker compose -f docker-compose.prod.yml up -d --scale frontend=2 --no-recreate

# Scale back to 1
docker compose -f docker-compose.prod.yml up -d --scale backend=1 --no-recreate

# See all running containers and their state
docker compose -f docker-compose.prod.yml ps
```

Nginx re-resolves Docker DNS on every request (`resolver 127.0.0.11 valid=5s` + `set $var` pattern
in `nginx-lb.conf`), so no nginx-lb restart is needed after scaling.

---

## Verification

```bash
# All services healthy
docker compose -f docker-compose.prod.yml ps

# API route → backend
curl -s http://localhost/actuator/health | jq .

# Frontend SPA → frontend container
curl -s http://localhost/ | grep -o '<title>.*</title>'

# Swagger UI
curl -s -o /dev/null -w "%{http_code}" http://localhost/swagger-ui/index.html

# Via HTTPS
curl -s https://yourdomain.com/actuator/health | jq .

# Logs (note: service is now "backend", not "app")
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx-lb
```

Test path-filter independence:

- Push a change only under `backend/` → only `Deploy Backend` workflow runs
- Push a change only under `frontend/` → only `Deploy Frontend` workflow runs

---

## Rollback

```bash
# Find last known-good commit
git log --oneline -10

# Rollback backend only
git checkout <GOOD_SHA> -- backend/
docker compose -f docker-compose.prod.yml up -d --build --no-deps backend

# Full stack rollback
git checkout <GOOD_SHA>
docker compose -f docker-compose.prod.yml up -d --build

# Emergency: revert to old single-container setup
docker compose -f docker-compose.prod.yml down
git checkout <OLD_SHA> -- docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d --build
# Then revert Caddyfile back to localhost:8080
sudo systemctl reload caddy
```

---

## Useful Commands Reference

| Action | Command |
|--------|---------|
| Start all | `docker compose -f docker-compose.prod.yml up -d` |
| Stop all | `docker compose -f docker-compose.prod.yml down` |
| Rebuild backend | `docker compose -f docker-compose.prod.yml up -d --build --no-deps backend` |
| Rebuild frontend | `docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend` |
| Scale backend | `docker compose -f docker-compose.prod.yml up -d --scale backend=3 --no-recreate` |
| Scale frontend | `docker compose -f docker-compose.prod.yml up -d --scale frontend=2 --no-recreate` |
| Backend logs | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Frontend logs | `docker compose -f docker-compose.prod.yml logs -f frontend` |
| Nginx-lb logs | `docker compose -f docker-compose.prod.yml logs -f nginx-lb` |
| Health check | `curl http://localhost/actuator/health` |
| Shell into backend | `docker compose -f docker-compose.prod.yml exec backend sh` |
| Shell into DB | `docker compose -f docker-compose.prod.yml exec postgres psql -U testcreator_user -d testcreator` |
| Prune old images | `docker image prune -f` |
| Disk usage | `docker system df` |
