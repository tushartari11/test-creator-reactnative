# Deployment Steps
## TestCreator — All Environments

**Last Updated:** 2026-05-10  
**Environments covered:** Local · Staging · Production (DigitalOcean VPS)

---

## Table of Contents

1. [Environment Overview](#1-environment-overview)
2. [Local Deployment](#2-local-deployment)
3. [Staging Deployment](#3-staging-deployment)
4. [Production Deployment — DigitalOcean VPS](#4-production-deployment--digitalocean-vps)
5. [Database Operations](#5-database-operations)
6. [Frontend Build & Deploy](#6-frontend-build--deploy)
7. [Automated Deployment Scripts](#7-automated-deployment-scripts)
8. [Rollback Procedure](#8-rollback-procedure)
9. [Health Checks & Monitoring](#9-health-checks--monitoring)
10. [Pre-Deployment Checklist](#10-pre-deployment-checklist)

---

## 1. Environment Overview

| Environment | Backend URL | Frontend URL | Deployment method |
|-------------|-------------|--------------|------------------|
| **Local** | `http://localhost:8080` | `http://localhost:8081` | Docker Compose + Bun dev server |
| **Staging** | `https://staging.testcreator.example.com` | Same origin (served by Spring Boot) | Docker Compose on VPS |
| **Production** | `http://167.71.60.139:8080` | Same origin (served by Spring Boot) | Docker Compose on DigitalOcean droplet |

The frontend web build is served as static files by Spring Boot. After an Expo web build, copy the output to `backend/src/main/resources/static/` before building the JAR.

---

## 2. Local Deployment

Use this for day-to-day development. See `DEVELOPER_MANUAL.md` for full setup instructions.

### Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis

# 2. Start backend (Terminal 2)
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local

# 3. Start frontend dev server (Terminal 3)
cd frontend
source ~/.nvm/nvm.sh && nvm use 22
~/.bun/bin/bun --bun x expo start --web --port 8081
```

### Backend `.env` (local)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=testcreator_pass
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=local-dev-secret-key-min-32-characters-long
SPRING_PROFILES_ACTIVE=local
```

### Frontend `.env.development`

```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api
EXPO_PUBLIC_APP_ENV=development
```

---

## 3. Staging Deployment

Staging uses the same Docker Compose approach as production but against a different server and with a separate database. All steps are identical to production — substitute your staging server IP/domain.

### Frontend `.env.staging`

```env
EXPO_PUBLIC_API_URL=https://staging.testcreator.example.com/api
EXPO_PUBLIC_APP_ENV=staging
```

Run frontend against staging:

```bash
cd frontend
npm run start:staging
```

---

## 4. Production Deployment — DigitalOcean VPS

### Prerequisites

| Item | Requirement |
|------|-------------|
| DigitalOcean Droplet | Ubuntu 24.04 LTS, minimum 2 GB RAM |
| SSH access | Key-based (password auth disabled) |
| Docker | 20.x + Compose v2 plugin |
| Domain (optional) | Required for HTTPS via Caddy |

---

### Step 1 — First-Time Server Setup

Run once when provisioning a new droplet.

```bash
# SSH into the server as root
ssh root@YOUR_DROPLET_IP

# Create a non-root deploy user
adduser deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Install Docker Compose plugin (if not already present)
docker compose version
# If missing:
apt update && apt install -y docker-compose-plugin

# Configure firewall (only 22, 80, 443 publicly exposed — 8080 stays private)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Reconnect as deploy user
exit
ssh deploy@YOUR_DROPLET_IP
mkdir -p ~/apps/test-creator ~/backups
```

---

### Step 2 — Transfer the Project

**Option A — Git clone (recommended)**

```bash
ssh deploy@YOUR_DROPLET_IP
cd ~/apps
git clone YOUR_REPO_URL test-creator
cd test-creator
```

**Option B — rsync from local machine**

```bash
# Run from your local project root
rsync -avz \
  --exclude 'target/' \
  --exclude '.idea/' \
  --exclude 'logs/' \
  --exclude '.env' \
  --exclude 'frontend/node_modules/' \
  --exclude 'frontend/.expo/' \
  ./ deploy@YOUR_DROPLET_IP:~/apps/test-creator/
```

---

### Step 3 — Configure Environment

```bash
ssh deploy@YOUR_DROPLET_IP
cd ~/apps/test-creator

# Create .env from template
cp documentation/.env.example .env
nano .env
```

Generate strong random secrets:

```bash
openssl rand -base64 32   # run once for DB password
openssl rand -base64 32   # run once for Redis password
openssl rand -base64 48   # run once for JWT secret (≥ 32 chars required)
```

Production `.env`:

```env
# Database
DB_HOST=testcreator-postgres
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=<strong-random-password>

# Redis
REDIS_HOST=testcreator-redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-random-password>

# JWT — minimum 32 characters, keep secret
JWT_SECRET=<64-char-random-string>
JWT_EXPIRATION=86400000

# Application
SPRING_PROFILES_ACTIVE=production
BASE_URL=https://yourdomain.com

# CORS — add your domain here
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

> **Never commit this file.** `.env` is in `.gitignore`.

---

### Step 4 — Build the Frontend (Web)

The Expo web build is served by Spring Boot as static files.

**On your local machine:**

```bash
cd frontend
source ~/.nvm/nvm.sh && nvm use 22

# Build using production env
npm run web:prod -- --platform web

# Or using Expo directly
EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_API_URL=http://167.71.60.139:8080/api \
~/.bun/bin/bun --bun x expo export --platform web
```

Copy the output to the Spring Boot static directory:

```bash
# Clear old build
rm -rf ../backend/src/main/resources/static/*

# Copy new build
cp -r dist/* ../backend/src/main/resources/static/
```

Then commit the static files:

```bash
cd ..
git add backend/src/main/resources/static/
git commit -m "build: update frontend web build"
```

---

### Step 5 — Build and Start with Docker Compose

On the **production server**:

```bash
cd ~/apps/test-creator

# First time or after any code change — build and start
docker compose -f docker-compose.prod.yml up -d --build

# Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME                    STATUS
testcreator-postgres    Up (healthy)
testcreator-redis       Up (healthy)
testcreator-app         Up
```

Follow app startup logs:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail 100 app
# Wait for: "Started TestCreatorApplication in X.XXX seconds"
```

Application is now live at `http://YOUR_DROPLET_IP:8080`.

---

### Step 6 — Configure HTTPS with Caddy (Recommended)

Caddy automatically provisions and renews TLS certificates via Let's Encrypt.

**Install Caddy on the server:**

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

**Configure reverse proxy:**

```bash
sudo nano /etc/caddy/Caddyfile
```

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo systemctl restart caddy
```

**Lock the app port to localhost only** (prevents direct port 8080 access):

In `docker-compose.prod.yml`, change:
```yaml
ports:
  - "127.0.0.1:8080:8080"   # was "8080:8080"
```

Apply:
```bash
docker compose -f docker-compose.prod.yml up -d
```

Application is now accessible at `https://yourdomain.com`.

---

### Step 7 — Redeploy After Code Changes

```bash
ssh deploy@YOUR_DROPLET_IP
cd ~/apps/test-creator

# Pull latest code
git pull

# Rebuild and restart app container only (preserves database and Redis data)
docker compose -f docker-compose.prod.yml up -d --build app

# Follow logs to confirm clean startup
docker compose -f docker-compose.prod.yml logs -f --tail 50 app
```

---

## 5. Database Operations

### Backup

**Automated (recommended):** Set up a daily cron job on the server:

```bash
crontab -e
```

Add (runs at 2 AM daily):

```
0 2 * * * cd ~/apps/test-creator && \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U testcreator_user testcreator \
  > ~/backups/testcreator_$(date +\%Y\%m\%d).sql 2>&1
```

**Manual backup:**

```bash
# Production
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U testcreator_user testcreator > ~/backups/backup_$(date +%Y%m%d_%H%M).sql

# Local
docker-compose exec postgres pg_dump -U testcreator_user testcreator > backup.sql
```

### Restore

```bash
# Production
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U testcreator_user -d testcreator < ~/backups/backup_20260510_1400.sql

# Local
docker-compose exec -T postgres \
  psql -U testcreator_user -d testcreator < backup.sql
```

### Reset Schema (Local Development Only)

```bash
docker-compose exec postgres psql -U testcreator_user -d testcreator \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Flyway will re-run all migrations on next app startup
```

### Connect to Production Database from Local Machine

The production database is not exposed to the internet. Use an SSH tunnel:

```bash
# Open tunnel — leave this terminal open
ssh -N -L 5433:127.0.0.1:5432 deploy@YOUR_DROPLET_IP
```

Then connect your SQL client (DBeaver, pgAdmin, etc.) to:

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5433` |
| Database | value of `DB_NAME` from `.env` |
| Username | value of `DB_USERNAME` |
| Password | value of `DB_PASSWORD` |

---

## 6. Frontend Build & Deploy

### Build for Web (served by Spring Boot)

```bash
cd frontend
source ~/.nvm/nvm.sh && nvm use 22

# Production web build
EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_API_URL=http://167.71.60.139:8080/api \
~/.bun/bin/bun --bun x expo export --platform web

# Copy into backend static directory
rm -rf ../backend/src/main/resources/static/*
cp -r dist/* ../backend/src/main/resources/static/
```

Spring Boot serves everything under `/static/` at the root URL. `WebConfig` forwards unknown paths to `index.html` for client-side routing.

### Build for iOS / Android

```bash
# Ensure EAS CLI is installed
npm install -g eas-cli

# Configure EAS (first time only)
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Build for Android
eas build --platform android
```

---

## 7. Automated Deployment Scripts

These scripts live in `scripts/` in the project root.

| Script | What It Does | Data Effect |
|--------|-------------|-------------|
| `./scripts/build-deploy.sh` | Maven build → Docker build → replace app container | **Preserves** DB & Redis |
| `./scripts/build-deploy-fresh.sh` | Same as above but removes all volumes first | **Deletes** all data |
| `./scripts/backup-db.sh` | Creates timestamped DB backup in `backups/` | Writes new backup |
| `./scripts/restore-db.sh [file]` | Restores from backup (latest if no arg) | Overwrites DB |
| `./scripts/clean-logs.sh` | Truncates the application log file | Clears logs |

### Standard CI/CD Deploy (preserves data)

```bash
./scripts/build-deploy.sh
```

Steps performed:
1. `mvn clean package -DskipTests`
2. `docker build -t test-creator:latest .`
3. `docker-compose stop app && docker-compose rm -f app`
4. `docker-compose up -d`

### Fresh Environment Deploy (destroys data)

```bash
./scripts/build-deploy-fresh.sh
```

> **Warning:** All PostgreSQL and Redis data is permanently deleted.  
> Only use on new environments or when you explicitly need a clean slate.

---

## 8. Rollback Procedure

### Backend Rollback

If a deployment introduces a critical bug, roll back to the previous Docker image:

```bash
# Tag the current build before deploying (do this before every production deploy)
docker tag test-creator:latest test-creator:previous

# If the new deployment fails, restore previous image
docker-compose stop app
docker tag test-creator:previous test-creator:latest
docker-compose up -d app

# Follow logs to confirm recovery
docker-compose logs -f app
```

### Database Rollback

If a Flyway migration caused data issues:

```bash
# Restore the most recent pre-deploy backup
./scripts/restore-db.sh latest

# Or restore a specific backup
./scripts/restore-db.sh backups/testcreator_20260510_0200.sql
```

### Git Rollback

```bash
# Identify the last stable commit
git log --oneline -10

# Revert to it
git checkout <commit-hash>
./scripts/build-deploy.sh
```

---

## 9. Health Checks & Monitoring

### Endpoints

```bash
# Overall health
curl http://localhost:8080/actuator/health
# → {"status":"UP"}

# Database health
curl http://localhost:8080/actuator/health/db

# Redis health
curl http://localhost:8080/actuator/health/redis

# Prometheus metrics
curl http://localhost:8080/actuator/prometheus
```

### Logs

```bash
# Real-time app logs (Docker)
docker compose -f docker-compose.prod.yml logs -f --tail 50 app

# Real-time app logs (file)
tail -f logs/test-creator.log

# Last 30 minutes of logs
docker compose -f docker-compose.prod.yml logs --since 30m app

# Errors only
docker compose -f docker-compose.prod.yml logs app | grep -i "error\|exception"
```

### Log Configuration

| Setting | Value |
|---------|-------|
| Log file path (host) | `./logs/test-creator.log` |
| Log file path (container) | `/app/logs/test-creator.log` |
| Max file size | 10 MB |
| Retention | 7 days |
| Total cap | 100 MB |

### Resource Usage

```bash
# CPU and memory for all containers
docker stats

# Disk usage
docker system df
```

### Optional: Prometheus + Grafana

A monitoring stack is available in `docker-compose.monitoring.yml`:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

| Dashboard | URL |
|-----------|-----|
| Grafana | `http://YOUR_DROPLET_IP:3000` (admin / admin) |
| Prometheus | `http://YOUR_DROPLET_IP:9090` |

Configure Grafana data sources:
- Prometheus: `http://prometheus:9090`
- Loki: `http://loki:3100`

---

## 10. Pre-Deployment Checklist

### Before Every Production Deploy

- [ ] All tests pass locally: `mvn test`
- [ ] Database backup taken: `./scripts/backup-db.sh`
- [ ] Previous Docker image tagged: `docker tag test-creator:latest test-creator:previous`
- [ ] Frontend web build is current and copied to `backend/src/main/resources/static/`
- [ ] `.env` on the server has current passwords and `SPRING_PROFILES_ACTIVE=production`
- [ ] CORS `CORS_ALLOWED_ORIGINS` in `.env` matches the live domain
- [ ] No uncommitted changes: `git status`

### New Server Setup Only

- [ ] Non-root `deploy` user created and added to `docker` group
- [ ] UFW firewall: only ports 22, 80, 443 open (not 8080)
- [ ] Caddy configured with domain and HTTPS
- [ ] App port bound to `127.0.0.1:8080` (not `0.0.0.0:8080`)
- [ ] `restart: unless-stopped` set on all Docker services
- [ ] Automated DB backup cron job configured
- [ ] Docker log rotation configured (json-file, 10m × 5 files)

### Security Reminders

- [ ] `.env` is **not** committed to git
- [ ] `.env.production` and `.env.staging` are gitignored in `frontend/`
- [ ] JWT secret is at least 32 characters and unique per environment
- [ ] DB and Redis passwords are unique and randomly generated
- [ ] SSH password auth disabled on the server (`PasswordAuthentication no` in `sshd_config`)

---

## Quick Reference — Commands by Scenario

| Scenario | Command |
|----------|---------|
| Start local full stack | `docker-compose up -d postgres redis && cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local` |
| Start frontend (local) | `cd frontend && ~/.bun/bin/bun --bun x expo start --web --port 8081` |
| Start frontend (staging) | `cd frontend && npm run start:staging` |
| Deploy to production | `ssh deploy@IP && cd ~/apps/test-creator && git pull && docker compose -f docker-compose.prod.yml up -d --build` |
| Redeploy app only | `docker compose -f docker-compose.prod.yml up -d --build app` |
| View production logs | `docker compose -f docker-compose.prod.yml logs -f --tail 100 app` |
| Backup database | `./scripts/backup-db.sh` |
| Restore latest backup | `./scripts/restore-db.sh latest` |
| Health check | `curl http://localhost:8080/actuator/health` |
| Kill Expo port | `kill $(lsof -ti :8081)` |
| Switch to Node 22 | `source ~/.nvm/nvm.sh && nvm use 22` |

---

*See also: `documentation/DEVELOPER_MANUAL.md` · `docs/docker_deployment.md` · `documentation/vps-spring-boot-deployment-guide.md`*
