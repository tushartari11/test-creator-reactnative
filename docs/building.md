# Building & Deployment

## Backend (run from `backend/`)

```bash
# Development
mvn spring-boot:run
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Testing
mvn test
mvn test -Dtest=TestServiceTest                  # Single class
mvn test -Dtest=TestServiceTest#methodName       # Single method
mvn clean test jacoco:report                     # Coverage report

# Build
mvn clean install
mvn clean install -DskipTests
mvn clean package -P production

# Database
mvn flyway:migrate
mvn flyway:info

# Code Quality
mvn checkstyle:check
mvn spotbugs:check
mvn dependency-check:check
```

## Frontend (run from `frontend/`)

```bash
npm start                  # Start Expo dev server (prompts for platform)
npm run ios                # iOS simulator
npm run android            # Android emulator
npm run web                # Web browser via Expo

# Build web and deploy to Spring Boot static serving
npx expo export --platform web   # Outputs to frontend/dist/
# Then copy dist/ contents to backend/src/main/resources/static/
```

## Docker (run from project root)

```bash
docker-compose up -d postgres redis              # Infra only (for local backend dev)
docker-compose --profile full-stack up --build   # Full stack including app container
./scripts/build-deploy.sh                        # Deploy preserving data
./scripts/build-deploy-fresh.sh                  # Clean deploy (deletes data)
```

See [docker_deployment.md](docker_deployment.md) for full container and VPS deployment details.

---

## Environment Variables

### Required

```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
REDIS_HOST, REDIS_PORT
JWT_SECRET   (min 32 chars)
```

### Optional (with defaults)

```
REDIS_PASSWORD                (default: empty)
BASE_URL                      (default: http://localhost:8080) — used in guest access link generation
LOG_PATH                      (default: /app/logs)
GUEST_TOKEN_EXPIRY_HOURS      (default: 24)
CORS_ALLOWED_ORIGINS          (default: localhost:3000, localhost:4200)
PROCTORING_MAX_VIOLATIONS     (default: 10)
PROCTORING_MAX_CRITICAL       (default: 3)
PROCTORING_MAX_TAB_SWITCHES   (default: 5)
PROCTORING_HEARTBEAT_INTERVAL (default: 10s)
PROCTORING_HEARTBEAT_TIMEOUT  (default: 30s)
```

Profiles: `local`, `test`, `production`

See [docs/.env.example](.env.example) for a copy-paste template.

---

## Observability

Actuator endpoints exposed: `health`, `info`, `metrics`, `prometheus` — all under `/actuator/`.

Prometheus metrics at `/actuator/prometheus`. The `monitoring/` directory contains a Docker Compose setup for Grafana + Prometheus (used with `docker-compose --profile full-stack`).
