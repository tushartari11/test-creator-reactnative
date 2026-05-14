# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online Test Creator — monorepo with a Spring Boot 3.2.x backend and a React Native (Expo) frontend. The backend handles online examinations with proctoring, designed for high throughput (100K-1M QPS). The Expo frontend is built for web and mobile and can be served directly by Spring Boot (web build copied to `backend/src/main/resources/static/`).

**Backend stack**: Java 21, PostgreSQL 15+, Redis 7.x, Spring Security 6.x + JWT, Flyway, JUnit 5/Testcontainers  
**Frontend stack**: React Native 0.83.2, Expo 55, expo-router, TypeScript, react-native-reanimated v4

## Monorepo Structure

```
/                        ← project root (docker-compose lives here)
├── backend/             ← Spring Boot app (run Maven commands from here)
├── frontend/            ← Expo app (run npm/expo commands from here)
├── scripts/             ← deploy helpers (build-deploy.sh, build-deploy-fresh.sh)
├── monitoring/          ← Grafana + Prometheus Docker Compose setup
└── docs/                ← Architecture decisions, API reference, troubleshooting
```

> `frontend/` has its own `.git` repository and is tracked separately from the root.

## Quick Commands

See [docs/commands-reference.md](../docs/commands-reference.md) for the full command reference (backend, frontend, Docker).

## Environment Variables

### Required
```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
REDIS_HOST, REDIS_PORT
JWT_SECRET   (min 32 chars)
```

### Notable optional (with defaults)
```
BASE_URL                      (default: http://localhost:8080) — used in guest access link generation
GUEST_TOKEN_EXPIRY_HOURS      (default: 24)
PROCTORING_MAX_VIOLATIONS     (default: 10)
PROCTORING_MAX_CRITICAL       (default: 3)
PROCTORING_MAX_TAB_SWITCHES   (default: 5)
```

Profiles: `local`, `test`, `production`

## Backend Architecture

### Package Structure (`com.testcreator`)

`controller`, `service`, `repository`, `dto`, `entity`, `exception`, `security`, `config`, `util`

### Answer Submission: Dual-Write Pattern

Answers use a two-path write for durability without sacrificing throughput:

1. `POST /api/student/attempts/{id}/answer` → writes to PostgreSQL via native upsert **AND** caches to Redis
2. `AnswerSyncService` (`@Scheduled` every 30s) syncs unsynced Redis answers to PostgreSQL in the background
3. `AnswerSyncService.syncAllBeforeSubmit()` flushes all cached answers before final submission

**Redis key schema** (4-hour TTL):
- `answer:{attemptId}:{questionId}` → `CachedAnswerDTO`
- `attempt_answers:{attemptId}` → Set of questionIds answered
- `attempt_session:{attemptId}` → Hash with session metadata and last heartbeat

**Known performance issue**: `syncCachedAnswersToDatabase()` calls `testAttemptRepository.findAll()` and filters `IN_PROGRESS` in memory. At high load, replace with `findByStatus(IN_PROGRESS)`.

### Guest vs. Authenticated Test Flow

**Authenticated** (`/api/student/**`) → `StudentTestController` → `TestAttemptService`. `TestAttempt.student` is non-null.

**Guest** (`/api/guest/**`) → `GuestTestController`. Business logic lives in the controller (fat controller — intentional). `TestAttempt.student` is null; uses `guestToken` + `guestName` fields. Guest answers use `selectedOptionId` (option primary key), not option numbers 1–3.

Guest flow: teacher generates `access_code` on a `Test` → guest hits `GET /api/guest/access/{accessCode}` → `GuestTestSession` created with UUID `guestToken` → guest uses token for all subsequent calls → `GuestTestSession.isUsed` set to true on start. Unused session can be deleted via `DELETE /api/guest/sessions/{guestToken}` (only if `isUsed = false`).

### Options Constraint

Questions have exactly **3 options** (enforced by V11 migration). Authenticated submissions validate `selectedOption` in [1, 3]. Options are **shuffled randomly on every attempt fetch** — never rely on position stability.

### Caching (Redis)

| Data | TTL |
|------|-----|
| Tests | 2 hours |
| Questions | 4 hours |
| User profiles | 30 min |
| Results | 1 hour |
| Active test attempts | **Never cache** |
| Proctoring violations | **Never cache** |

### Security

**Roles**: `TEACHER`, `STUDENT`, `ADMIN`  
**Public endpoints**: `/api/auth/**`, `/api/guest/**`, `/actuator/health`, `/swagger-ui/**`  
JWT: access token 24h, refresh token 7d. BCrypt cost factor 12. Tokens blacklisted in Redis on logout.  
Rate limiting: 1000 req/hr default, 5 req/min for auth endpoints (`app.rate-limit.*`).

## Frontend Architecture

Uses **expo-router** (file-based routing). Styling uses React Native `StyleSheet` — not NativeWind/Tailwind. Responsive layout uses `useWindowDimensions` with `>768` (medium) and `>1024` (large) breakpoints, applied via `isLargeScreen`/`isMediumScreen` boolean conditional style arrays. `Platform.select()` for platform-specific shadows.

Spring Boot serves the Expo web build as static files. `WebConfig` forwards non-API paths to `index.html` for client-side routing.

## Saving and Looking up required UI screenshots/snapshots
The UI screenshots/snapshots taken during the processing are to be taken or saved into ../docs/screenshots directory

## Docs Reference

| Topic | File |
|-------|------|
| Architecture Overview | [docs/architecture_overview.md](../docs/architecture_overview.md) |
| Architectural Decisions | [docs/architectural_decisions.md](../docs/architectural_decisions.md) |
| Coding Standards | [docs/coding_standards.md](../docs/coding_standards.md) |
| Commands Reference | [docs/commands-reference.md](../docs/commands-reference.md) |
| Coding Guidelines (detailed) | [docs/coding-guidelines.md](../docs/coding-guidelines.md) |
| Building & Deployment | [docs/building.md](../docs/building.md) |
| Testing | [docs/testing.md](../docs/testing.md) |
| API Reference | [docs/api_reference.md](../docs/api_reference.md) |
| Project Status & Phases | [docs/project_status.md](../docs/project_status.md) · [docs/phase2_planning.md](../docs/phase2_planning.md) |
| Docker Deployment | [docs/docker_deployment.md](../docs/docker_deployment.md) |
| Troubleshooting | [docs/troubleshooting.md](../docs/troubleshooting.md) |
