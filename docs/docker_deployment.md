# Docker Deployment Guide

## Prerequisites

- Docker & Docker Compose installed
- Port 8080 available (Spring Boot)
- Port 5432 available (PostgreSQL)
- Port 6379 available (Redis)

## Quick Start

### 1. Start Infrastructure Only

```bash
docker-compose up -d postgres redis
```

Monitor container health:

```bash
docker-compose ps
```

Expected output:

```
NAME              IMAGE              STATUS
testcreator-postgres  postgres:15    healthy
testcreator-redis     redis:7        healthy
```

### 2. Build and Run Application

```bash
# Option A: Run locally with Maven
mvn clean install -DskipTests
mvn spring-boot:run

# Option B: Build Docker image and run
docker build -t test-creator:latest .
docker run -d --network test-creator_testcreator-network \
  -e DB_HOST=testcreator-postgres \
  -e REDIS_HOST=testcreator-redis \
  -p 8080:8080 \
  test-creator:latest
```

### 3. Full Stack with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

Create `.env` file:

```env
# Database
DB_HOST=testcreator-postgres
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=secure_password_here
DB_DRIVER=org.postgresql.Driver

# Redis
REDIS_HOST=testcreator-redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-256-bit-secret-key-change-this-in-production-minimum-32-characters
JWT_EXPIRATION=86400000

# Spring Profiles
SPRING_PROFILES_ACTIVE=local

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200
```

### Application Profiles

**Development (application-local.yml):**

```yaml
server:
  port: 8080
spring:
  jpa:
    show-sql: true
  flyway:
    baseline-on-migrate: true
logging:
  level:
    root: INFO
    com.testcreator: DEBUG
```

**Production (application-production.yml):**

```yaml
server:
  port: 8080
spring:
  jpa:
    show-sql: false
  flyway:
    baseline-on-migrate: false
logging:
  level:
    root: WARN
    com.testcreator: INFO
```

## Database Initialization

Flyway automatically runs migrations:

```
V1__create_users_table.sql
V2__create_tests_table.sql
V3__create_questions_table.sql
V4__create_options_table.sql
V5__create_test_attempts_table.sql
V6__create_student_answers_table.sql
```

To reset (development only):

```bash
docker-compose exec postgres psql -U testcreator_user -d testcreator -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

## Accessing Services

### Application

```
http://localhost:8080
```

### Swagger UI

```
http://localhost:8080/swagger-ui.html
```

### API Documentation

```
http://localhost:8080/v3/api-docs
http://localhost:8080/v3/api-docs.yaml
```

### Health Check

```bash
curl http://localhost:8080/actuator/health
```

### Metrics

```bash
curl http://localhost:8080/actuator/metrics
```

### Database Access (Development)

```bash
docker-compose exec postgres psql -U testcreator_user -d testcreator

# Useful queries
\dt                                    # List tables
\d users                               # Describe table
SELECT * FROM users;                   # Query data
```

### Redis Access (Development)

```bash
docker-compose exec redis redis-cli
ping                                   # Test connection
keys *                                 # List all keys
get <key>                              # Get value
```

## Testing the API

### 1. Register a Teacher

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Teacher123!",
    "name": "John Teacher",
    "role": "TEACHER"
  }'
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "user": {
    "id": 1,
    "email": "teacher@example.com",
    "name": "John Teacher",
    "role": "TEACHER"
  }
}
```

### 2. Create a Test

```bash
TOKEN="<paste_token_here>"

curl -X POST http://localhost:8080/api/tests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Java Fundamentals",
    "description": "Test covering Java basics",
    "totalQuestions": 1,
    "passingScore": 70,
    "durationMinutes": 30,
    "questions": [
      {
        "questionNumber": 1,
        "questionText": "What is Java?",
        "explanation": "Java is a programming language",
        "correctOptionNumber": 1,
        "options": [
          {"optionNumber": 1, "optionText": "Programming language"},
          {"optionNumber": 2, "optionText": "Coffee brand"},
          {"optionNumber": 3, "optionText": "Island"},
          {"optionNumber": 4, "optionText": "Database"}
        ]
      }
    ]
  }'
```

### 3. Publish Test

```bash
TEST_ID="1"  # From previous response

curl -X POST http://localhost:8080/api/tests/$TEST_ID/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Container Won't Start

**Error:** `Connection refused`

```bash
# Check if ports are in use
lsof -i :8080
lsof -i :5432
lsof -i :6379

# Remove conflicting containers
docker-compose down
docker ps -a
docker rm <container_id>
```

### Database Connection Failed

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify network
docker network ls
docker network inspect test-creator_testcreator-network

# Test connection
docker-compose exec postgres pg_isready -U testcreator_user
```

### Application Won't Connect to Database

Check in logs:

```bash
docker-compose logs app | grep -i "error\|exception"
```

Solutions:

1. Ensure `DB_HOST` matches service name in docker-compose.yml
2. Wait for PostgreSQL to be ready (health checks)
3. Verify environment variables are set
4. Check network connectivity: `docker-compose exec app ping postgres`

### Redis Connection Issues

```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

## Performance Tuning

### PostgreSQL Connection Pool

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50
      minimum-idle: 10
      connection-timeout: 30000
```

### Redis Configuration

```yaml
spring:
  data:
    redis:
      timeout: 2000ms
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 2
```

## Production Deployment

### Environment Variables for Production

```env
SPRING_PROFILES_ACTIVE=production
DB_USERNAME=prod_user
DB_PASSWORD=strong_password_here
JWT_SECRET=production_256_bit_secret_key_minimum_32_characters
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Database Backup

```bash
# Create timestamped backup (recommended)
./scripts/backup-db.sh

# List available backups
./scripts/restore-db.sh

# Restore latest backup
./scripts/restore-db.sh latest

# Restore specific backup
./scripts/restore-db.sh backups/testcreator_20260214_120000.sql

# Manual backup (alternative)
docker-compose exec postgres pg_dump -U testcreator_user testcreator > backup.sql

# Manual restore (alternative)
docker-compose exec -T postgres psql -U testcreator_user testcreator < backup.sql
```

**Note:** Backups are stored in `backups/` directory. Only the last 10 backups are kept automatically.

### Monitoring

```bash
# View resource usage
docker stats

# Check service health
curl http://localhost:8080/actuator/health/db
curl http://localhost:8080/actuator/health/redis
```

## Docker Compose File

Location: `docker-compose.yml`

Key services:

- **postgres** - PostgreSQL 15 with persistent volume
- **redis** - Redis 7 with persistence
- **app** - Spring Boot application (optional, can run locally)

Volumes:

- `postgres_data` - Database persistence
- `redis_data` - Cache persistence

Network:

- `testcreator-network` - Custom bridge network for inter-container communication

## Deployment Scripts

Helper scripts are available in `scripts/` for common deployment tasks.

### Build & Deploy (Preserves Data)

For CI/CD pipelines - rebuilds the app while keeping database and Redis data:

```bash
./scripts/build-deploy.sh
```

**What it does:**
1. Builds Maven project (`mvn clean package -DskipTests`)
2. Builds Docker image
3. Stops and removes only the app container (volumes preserved)
4. Starts all services

### Build & Deploy Fresh (Clean Slate)

Removes all volumes and starts fresh - **deletes all data**:

```bash
./scripts/build-deploy-fresh.sh
```

**Warning:** This deletes all PostgreSQL and Redis data!

### Script Summary

| Script | Purpose | Data |
|--------|---------|------|
| `./scripts/build-deploy.sh` | CI/CD deployments | **Preserves** |
| `./scripts/build-deploy-fresh.sh` | Fresh environment | **Deletes** |
| `./scripts/clean-logs.sh` | Clear log file | N/A |
| `./scripts/backup-db.sh` | Backup database | Creates backup |
| `./scripts/restore-db.sh` | Restore database | Restores from backup |

## Logging

Application logs are written to a file and mounted from the container.

### Log Configuration

| Setting | Value |
|---------|-------|
| Log file | `logs/test-creator.log` |
| Max file size | 10MB |
| Max history | 7 days |
| Total size cap | 100MB |

### Viewing Logs

```bash
# View application logs in real-time
tail -f logs/test-creator.log

# View Docker logs
docker-compose logs -f app

# Clear log file
./scripts/clean-logs.sh
```

### Log Location

- **Host:** `./logs/test-creator.log`
- **Container:** `/app/logs/test-creator.log`

The `logs/` directory is mounted as a volume in `docker-compose.yml`.

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Follow only app logs
docker-compose logs -f app

# Execute command in container
docker-compose exec postgres psql -U testcreator_user -d testcreator

# Restart services
docker-compose restart

# Remove everything
docker-compose down -v  # -v removes volumes

# Rebuild images
docker-compose build --no-cache

# Pull latest images
docker-compose pull
```

## Next Steps

1. ✅ Start Docker containers
2. ✅ Run application
3. ✅ Access Swagger UI
4. ✅ Test endpoints
5. ✅ Proceed to Phase 2 (Student features)

---

See [SWAGGER_GUIDE.md](SWAGGER_GUIDE.md) for API testing documentation.
