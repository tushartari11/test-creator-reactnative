# Developer Manual
## TestCreator — How to Run the Project

**Audience:** Engineers setting up the project for the first time or returning after a break.  
**Last Updated:** 2026-05-10  
**Stack:** Java 21 · Spring Boot 3.2 · PostgreSQL 15 · Redis 7 · React Native 0.83 · Expo 55 · Node 22 · Bun 1.3

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [Backend Setup](#3-backend-setup)
4. [Frontend Setup](#4-frontend-setup)
5. [Environment Configuration](#5-environment-configuration)
6. [Running the Full Stack Locally](#6-running-the-full-stack-locally)
7. [Switching Environments](#7-switching-environments)
8. [Git & Branch Workflow](#8-git--branch-workflow)
9. [Useful Commands Reference](#9-useful-commands-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Install and verify each tool before continuing.

### Required

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Java JDK | 21 | `brew install openjdk@21` (macOS) |
| Maven | 3.9.x | `brew install maven` |
| Node.js | **22.x** (use nvm) | see below |
| Bun | 1.3.x | `curl -fsSL https://bun.sh/install \| bash` |
| Docker | 20.x + Compose v2 | [docker.com/get-docker](https://docker.com/get-docker) |
| Git | Latest | pre-installed on macOS |

### Node Version Manager (nvm)

This project requires **Node 22**. Use nvm to manage versions:

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install and activate Node 22
nvm install 22
nvm use 22

# Verify
node --version  # → v22.x.x
```

Add this to your `~/.zshrc` so Node 22 loads automatically:

```bash
nvm use 22
```

### Verify Bun

Bun is installed to `~/.bun/bin/bun`. It is not always in `$PATH` on a fresh shell:

```bash
# Check version
~/.bun/bin/bun --version  # → 1.3.x

# Add to PATH permanently (add to ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"
```

### Recommended IDE

- **IntelliJ IDEA Ultimate** — for the Spring Boot backend
- **VS Code** — for the React Native frontend

---

## 2. Repository Structure

```
/                               ← project root
├── backend/                    ← Spring Boot app (Maven)
│   └── src/
│       ├── main/java/          ← application source
│       └── main/resources/     ← application.yml, Flyway migrations
├── frontend/                   ← Expo / React Native app (has own .git)
│   ├── app/                    ← expo-router screens
│   │   ├── (auth)/             ← login.tsx, register.tsx
│   │   ├── (student)/          ← student screens
│   │   ├── (teacher)/          ← teacher screens
│   │   └── (guest)/            ← guest screens
│   ├── src/lib/                ← api.ts, auth.tsx, config.ts, theme.ts
│   ├── .env                    ← committed fallback defaults
│   ├── .env.development        ← local dev (localhost)
│   ├── .env.staging            ← staging (gitignored)
│   ├── .env.production         ← production (gitignored)
│   └── .env.example            ← template, safe to commit
├── scripts/                    ← build-deploy.sh, backup-db.sh, etc.
├── documentation/              ← developer docs (you are here)
├── docs/                       ← architecture, API reference, migration guide
└── docker-compose.yml          ← PostgreSQL + Redis (local dev)
```

> `frontend/` has its own independent git repository.  
> All other directories are tracked by the root repository.

---

## 3. Backend Setup

### Step 1 — Start Infrastructure (PostgreSQL + Redis)

From the **project root** (not `backend/`):

```bash
docker-compose up -d postgres redis
```

Wait for both to be healthy:

```bash
docker-compose ps
# Expected:
# testcreator-postgres  postgres:15  healthy
# testcreator-redis     redis:7      healthy
```

### Step 2 — Configure Environment Variables

```bash
cd backend
cp ../documentation/.env.example .env
```

Edit `.env` with your local values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=testcreator_pass

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your-local-dev-secret-key-min-32-chars-long

SPRING_PROFILES_ACTIVE=local
```

> **Do not commit `.env`.** It is already in `.gitignore`.

### Step 3 — Build the Backend

```bash
cd backend
mvn clean install -DskipTests
```

### Step 4 — Run the Backend

```bash
# Option A: Maven (recommended for development — hot reload via DevTools)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Option B: Run the JAR directly
java -jar target/test-creator-*.jar --spring.profiles.active=local
```

Backend starts on **http://localhost:8080**.

### Step 5 — Verify Backend is Running

```bash
curl http://localhost:8080/actuator/health
# → {"status":"UP"}
```

Swagger UI: **http://localhost:8080/swagger-ui.html**

---

## 4. Frontend Setup

The frontend lives at `frontend/` and has its own `package.json` and `.git`.  
All frontend commands must be run from inside `frontend/`.

### Step 1 — Install Dependencies

```bash
cd frontend
source ~/.nvm/nvm.sh && nvm use 22   # ensure Node 22
npm install
```

### Step 2 — Confirm Environment File

The `.env.development` file should already exist (it is committed):

```bash
cat .env.development
# EXPO_PUBLIC_API_URL=http://localhost:8080/api
# EXPO_PUBLIC_APP_ENV=development
```

If it is missing, create it:

```bash
cp .env.example .env.development
# Edit EXPO_PUBLIC_API_URL to http://localhost:8080/api
```

### Step 3 — Start the Frontend Dev Server

```bash
# With bun (recommended)
source ~/.nvm/nvm.sh && nvm use 22
~/.bun/bin/bun --bun x expo start --web --port 8081

# Or with npm
npm run web
```

> **Why both Node 22 and bun?**  
> Metro (Expo's bundler) requires Node ≥ 20. Bun is used as the package runner  
> (`bun x expo`) which is faster than `npx expo`. Node 22 must still be active.

Frontend starts on **http://localhost:8081**.

### Step 4 — Open in Browser

```bash
open http://localhost:8081/(auth)/login
```

Available routes:

| Route | Screen |
|-------|--------|
| `http://localhost:8081` | Landing page |
| `http://localhost:8081/(auth)/login` | Login |
| `http://localhost:8081/(auth)/register` | Register |

---

## 5. Environment Configuration

### How It Works

The frontend uses Expo's built-in `.env` file support. Only variables prefixed with `EXPO_PUBLIC_` are bundled into the client.

```
.env              ← committed — base defaults for all envs
.env.development  ← committed — localhost (used by `expo start`)
.env.staging      ← gitignored — staging server
.env.production   ← gitignored — production server
.env.local        ← gitignored — your personal overrides (highest priority)
.env.example      ← committed — template for new developers
```

### The Two Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend base URL including `/api` path |
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production` |

### Env File Loading Order

Expo loads files from lowest to highest priority:

```
.env  →  .env.[mode]  →  .env.local  →  .env.[mode].local
```

`mode` is `development` when running `expo start` and `production` for production builds.

### Values Per Environment

| Env | `EXPO_PUBLIC_API_URL` |
|-----|-----------------------|
| development | `http://localhost:8080/api` |
| staging | `https://staging.testcreator.example.com/api` |
| production | `http://167.71.60.139:8080/api` |

### Where It's Read

`src/lib/config.ts` is the single source of truth at runtime:

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
export const APP_ENV      = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
export const IS_DEV       = APP_ENV === 'development';
export const IS_PROD      = APP_ENV === 'production';
```

### Personal Overrides

To point the frontend at a different server without touching any committed file:

```bash
# frontend/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.42:8080/api
```

This file is gitignored and takes the highest priority.

---

## 6. Running the Full Stack Locally

Complete startup sequence from a cold machine:

```bash
# ── Terminal 1: Infrastructure ─────────────────────────────
cd /path/to/test-creator-reactnative
docker-compose up -d postgres redis

# ── Terminal 2: Backend ────────────────────────────────────
cd backend
source ~/.nvm/nvm.sh && nvm use 22
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Wait for: "Started TestCreatorApplication in X.XXX seconds"

# ── Terminal 3: Frontend ───────────────────────────────────
cd frontend
source ~/.nvm/nvm.sh && nvm use 22
~/.bun/bin/bun --bun x expo start --web --port 8081
```

Once all three are running:

| Service | URL |
|---------|-----|
| Frontend (web) | http://localhost:8081 |
| Backend API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Health check | http://localhost:8080/actuator/health |

### Stopping Everything

```bash
# Stop frontend: Ctrl+C in Terminal 3
# Stop backend:  Ctrl+C in Terminal 2
# Stop Docker:
docker-compose down
```

---

## 7. Switching Environments

### Frontend

```bash
cd frontend

# Local development (default)
npm start                  # or: ~/.bun/bin/bun --bun x expo start --web --port 8081

# Staging server
npm run start:staging

# Production server
npm run start:prod
```

### Backend Spring Profiles

```bash
# Local (default — verbose SQL logging, Flyway baseline-on-migrate)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Production profile
mvn spring-boot:run -Dspring-boot.run.profiles=production
```

### CORS Configuration

The backend `SecurityConfig.java` allows these origins by default:

```
http://localhost:3000
http://localhost:4200
http://localhost:5173
http://localhost:8081   ← Expo web dev server
http://localhost:19006  ← Expo web (alternate port)
```

If you need to add another origin (e.g. a colleague's machine on the local network), edit:

```
backend/src/main/java/com/testcreator/config/SecurityConfig.java
```

Find `corsConfigurationSource()` and add the origin to the `setAllowedOrigins` list.

---

## 8. Git & Branch Workflow

### Root Repository

The project root uses a standard feature-branch workflow:

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Commit
git add <files>
git commit -m "feat: description"

# Push and open PR
git push origin feature/your-feature-name
```

### Frontend Repository

`frontend/` is an independent git repository (separate `.git` directory). Commit frontend changes separately:

```bash
cd frontend
git add <files>
git commit -m "feat: description"
```

### Git Worktrees (Screen-by-Screen Development)

Each new screen is developed in an isolated git worktree to enable parallel development without branches interfering:

```bash
cd frontend

# 1. Create branch + worktree
git branch feature/screen-N-name
git worktree add /tmp/wt-screen-N feature/screen-N-name

# 2. Work in the isolated worktree
# (write files to /tmp/wt-screen-N/...)
cd /tmp/wt-screen-N
git add -A
git commit -m "feat: add screen N"

# 3. Merge back to master
cd /path/to/frontend
git merge feature/screen-N-name --no-ff

# 4. Clean up
git worktree remove /tmp/wt-screen-N
```

List active worktrees at any time:

```bash
git worktree list
```

See `docs/screen-implementation-plan.md` for the full list of screens and their status.

---

## 9. Useful Commands Reference

### Backend

```bash
# Build (skip tests)
mvn clean install -DskipTests

# Run tests
mvn test

# Run a specific test class
mvn test -Dtest=AuthServiceTest

# Check if backend is running
curl -s http://localhost:8080/actuator/health | python3 -m json.tool

# Tail application log
tail -f logs/test-creator.log
```

### Frontend

```bash
# Install dependencies
npm install

# Start web dev server (development)
npm run web

# Start web dev server (staging)
npm run web:staging

# Start web dev server (production API)
npm run start:prod

# Open iOS simulator
npm run ios

# Open Android emulator
npm run android

# Type-check without building
npx tsc --noEmit
```

### Docker

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Check container health
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop infrastructure
docker-compose down

# Stop and wipe all data (destructive)
docker-compose down -v

# Open PostgreSQL shell
docker-compose exec postgres psql -U testcreator_user -d testcreator

# Open Redis shell
docker-compose exec redis redis-cli

# Check Redis is live
docker-compose exec redis redis-cli ping   # → PONG
```

### Database

```bash
# Reset schema (development only — destroys all data)
docker-compose exec postgres psql -U testcreator_user -d testcreator \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# List tables
docker-compose exec postgres psql -U testcreator_user -d testcreator -c "\dt"

# Manual backup
docker-compose exec postgres pg_dump -U testcreator_user testcreator > backup.sql
```

---

## 10. Troubleshooting

### "Failed to fetch" on the Register / Login screen

**Cause:** One of three things — backend not running, wrong API URL, or CORS blocking the request.

**Diagnosis:**
```bash
# 1. Is the backend running?
curl http://localhost:8080/actuator/health
# → {"status":"UP"} means running. Connection refused means not running.

# 2. Is CORS allowing localhost:8081?
curl -I -X OPTIONS http://localhost:8080/api/auth/register \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST"
# → Should include Access-Control-Allow-Origin: http://localhost:8081
```

**Fix CORS (if needed):** Add `http://localhost:8081` to the allowed origins in `SecurityConfig.java`.

**Fix API URL:** Check `frontend/.env.development` — `EXPO_PUBLIC_API_URL` must be `http://localhost:8080/api`.

---

### Expo "expo-secure-store is not a function" error

**Cause:** Running on web where `expo-secure-store` is not supported.

**Fix:** Already resolved. `src/lib/storage.ts` provides a platform-aware adapter:
- Web → `localStorage`
- Native → `expo-secure-store`

If the error reappears, check that `storage.ts` is imported everywhere instead of calling `expo-secure-store` directly.

---

### "Port 8081 is running this app in another window"

An old Expo process is still holding port 8081.

```bash
# Kill it
kill $(lsof -ti :8081) 2>/dev/null
# Then restart the dev server
```

---

### Node version error from Expo

```
Node.js (v18.x.x) is outdated and unsupported.
```

Switch to Node 22:

```bash
source ~/.nvm/nvm.sh && nvm use 22
node --version  # → v22.x.x
```

---

### Backend fails to connect to database

```bash
# Check PostgreSQL is healthy
docker-compose ps

# If not started:
docker-compose up -d postgres redis

# Check connection manually
docker-compose exec postgres pg_isready -U testcreator_user
# → localhost:5432 - accepting connections
```

---

### Maven build fails — "package not found" or "dependency resolution"

```bash
# Force refresh all dependencies
mvn clean install -U -DskipTests

# If still failing, clear local Maven cache
rm -rf ~/.m2/repository
mvn clean install -DskipTests
```

---

### Metro cache error on startup

```
Error while reading cache, falling back to a full crawl
```

This is non-fatal and resolves itself on the next bundle. Safe to ignore. If bundling itself fails:

```bash
# Clear Metro cache
npx expo start --clear
```

---

*See also: `docs/troubleshooting.md` for backend-specific issues.*
