# Online Test Creator

High-performance Spring Boot application for creating and administering online examinations with advanced proctoring features. Designed to handle 100K-1M queries per second (QPS).

## 🚀 Quick Start

### Prerequisites
- Java 21
- Maven 3.9+
- Docker & Docker Compose (for PostgreSQL and Redis)

### Running Locally

1. **Start Database Services**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the Application**
   ```bash
   mvn spring-boot:run
   ```

4. **Access the Application**
   - API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger-ui.html
   - Actuator: http://localhost:8080/actuator/health

### Running with Docker Compose (Full Stack)

```bash
# Build and start all services (app, postgres, redis)
docker-compose --profile full-stack up --build
```

## 🛠️ Deployment Scripts

Helper scripts are available in the `scripts/` directory for common operations.

### Build & Deploy (Preserves Data)

Use this for CI/CD deployments - rebuilds the app while keeping database and Redis data intact:

```bash
./scripts/build-deploy.sh
```

**What it does:**
1. Builds Maven project (`mvn clean package -DskipTests`)
2. Builds Docker image
3. Stops and removes only the app container
4. Starts all services with existing volumes

### Build & Deploy Fresh (Deletes All Data)

Use this for a clean slate - removes all volumes and starts fresh:

```bash
./scripts/build-deploy-fresh.sh
```

**Warning:** This deletes all PostgreSQL and Redis data!

### Clean Logs

Clear the application log file:

```bash
./scripts/clean-logs.sh
```

### Database Backup & Restore

```bash
# Create a backup
./scripts/backup-db.sh

# List available backups
./scripts/restore-db.sh

# Restore latest backup
./scripts/restore-db.sh latest

# Restore specific backup
./scripts/restore-db.sh backups/testcreator_20260214_120000.sql
```

Backups are stored in `backups/` directory (last 10 kept automatically).

## 📋 Logging

Application logs are written to `logs/test-creator.log` and mounted from the Docker container.

### Log Configuration

| Setting | Value |
|---------|-------|
| Log file | `logs/test-creator.log` |
| Max file size | 10MB |
| Max history | 7 days |
| Total size cap | 100MB |

### Viewing Logs

```bash
# View logs in real-time
tail -f logs/test-creator.log

# Or via Docker
docker-compose logs -f app

# Clear logs
./scripts/clean-logs.sh
```

## 📦 Project Structure

```
src/main/java/com/testcreator/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── dto/            # Data Transfer Objects
├── entity/         # JPA entities
├── exception/      # Custom exceptions
├── repository/     # JPA repositories
├── security/       # JWT & Spring Security
├── service/        # Business logic
└── util/           # Utility classes
```

## 🗄️ Database

### Running Migrations

```bash
# Run Flyway migrations
mvn flyway:migrate

# Check migration status
mvn flyway:info

# Validate migrations
mvn flyway:validate
```

### Database Schema

- `users` - User accounts (teachers and students)
- `tests` - Test definitions
- `questions` - Questions within tests
- `options` - Answer options (4 per question)
- `test_attempts` - Student test sessions
- `student_answers` - Individual answers

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run with coverage
mvn clean test jacoco:report
# View: target/site/jacoco/index.html

# Run integration tests
mvn verify -P integration-test
```

## 📚 API Documentation

Once running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/v3/api-docs

## 🏗️ Technology Stack

- **Framework**: Spring Boot 3.2.2
- **Language**: Java 21
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7.x
- **Security**: Spring Security 6.x + JWT
- **Documentation**: SpringDoc OpenAPI
- **Testing**: JUnit 5, Mockito, Testcontainers
- **Build**: Maven 3.9.x

## 🔧 Configuration

### Profiles

- `local` - Local development (default)
- `test` - Testing with H2 in-memory database
- `production` - Production deployment

### Environment Variables

Required environment variables:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-minimum-32-characters
```

## 🎯 Current Status

**Phase 1: MVP Foundation - IN PROGRESS**

### ✅ Completed
- [x] Maven project setup with all dependencies
- [x] Application configuration (local, test, production)
- [x] JPA entities (User, Test, Question, Option, TestAttempt, StudentAnswer)
- [x] Enums (Role, TestStatus, AttemptStatus, ResultStatus)
- [x] Repository interfaces with optimized custom queries
- [x] Flyway database migrations (V1-V6)
- [x] Docker Compose setup (PostgreSQL + Redis)

### 🔄 In Progress
- [ ] Custom exception classes
- [ ] DTO classes (requests/responses)
- [ ] JWT utilities and Spring Security configuration
- [ ] Service layer (business logic)
- [ ] REST controllers (API endpoints)
- [ ] Global exception handler
- [ ] Unit tests

### 📋 Next Steps (Phase 2)
- [ ] Proctoring features (browser-based security)
- [ ] Performance optimization (caching, read/write splitting)
- [ ] Advanced testing and load testing

## 📖 Documentation

For detailed information, see:
- `CLAUDE.md` - AI assistant guide with code examples
- `TECHNICAL_DOCUMENTATION.md` - Complete technical specs
- `API_REFERENCE.md` - REST API documentation
- `ARCHITECTURAL_DECISIONS.md` - Architecture decision records
- `.claude/coding-guidelines.md` - Coding standards

## 🤝 Contributing

1. Follow the coding guidelines in `.claude/coding-guidelines.md`
2. Write tests for new features
3. Ensure all tests pass: `mvn test`
4. Run code quality checks: `mvn checkstyle:check spotbugs:check`

## 📄 License

Copyright © 2026 Test Creator Team

---

**Version**: 0.0.1-SNAPSHOT
**Last Updated**: February 11, 2026
