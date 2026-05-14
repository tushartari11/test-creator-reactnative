# Project Setup Guide - Online Test Creator

## Prerequisites

### Required Software

- **Java JDK**: 21 or higher (OpenJDK or Oracle JDK)
- **Maven**: 3.9.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **Docker**: 20.x or higher (optional, for containerized development)
- **Git**: Latest version

### Recommended IDE

- **IntelliJ IDEA Ultimate** (recommended) or
- **Eclipse IDE for Enterprise Java and Web Developers** or
- **Visual Studio Code** with Java extensions

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/test-creator.git
cd test-creator
```

### Step 2: Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d postgres redis

# Wait for containers to be ready
docker-compose ps
```

#### Option B: Manual Installation

**PostgreSQL Setup:**

```bash
# Install PostgreSQL 15
# Ubuntu/Debian
sudo apt-get install postgresql-15

# macOS
brew install postgresql@15

# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS

# Create database and user
sudo -u postgres psql

CREATE DATABASE testcreator;
CREATE USER testcreator_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE testcreator TO testcreator_user;
\q
```

**Redis Setup:**

```bash
# Install Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS

# Verify Redis is running
redis-cli ping  # Should return PONG
```

### Step 3: Configure Application

Create `src/main/resources/application-local.yml`:

```yaml
server:
  port: 8080

spring:
  application:
    name: test-creator

  datasource:
    url: jdbc:postgresql://localhost:5432/testcreator
    username: testcreator_user
    password: your_secure_password
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  redis:
    host: localhost
    port: 6379

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

jwt:
  secret: your-256-bit-secret-key-change-this-in-production
  expiration: 86400000 # 24 hours

logging:
  level:
    com.testcreator: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
```

### Step 4: Initialize Database Schema

```bash
# Run Flyway migration to create tables
mvn flyway:migrate

# Or if using the application
mvn spring-boot:run
```

### Step 5: Build the Project

```bash
# Clean and build
mvn clean install

# Skip tests for faster build
mvn clean install -DskipTests
```

### Step 6: Run the Application

```bash
# Using Maven
mvn spring-boot:run

# Or run the JAR directly
java -jar target/test-creator-0.0.1-SNAPSHOT.jar

# With specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The application will start on `http://localhost:8080`

### Step 7: Verify Installation

```bash
# Health check
curl http://localhost:8080/actuator/health

# Should return:
# {"status":"UP"}

# API documentation (if SpringDoc is configured)
# Open in browser: http://localhost:8080/swagger-ui.html
```

---

## Docker Development Environment

### Complete Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: test-creator-postgres
    environment:
      POSTGRES_DB: testcreator
      POSTGRES_USER: testcreator_user
      POSTGRES_PASSWORD: testcreator_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - test-creator-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testcreator_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: test-creator-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - test-creator-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: test-creator-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: docker
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: testcreator
      DB_USERNAME: testcreator_user
      DB_PASSWORD: testcreator_pass
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "8080:8080"
    networks:
      - test-creator-network
    volumes:
      - ./logs:/app/logs

volumes:
  postgres_data:
  redis_data:

networks:
  test-creator-network:
    driver: bridge
```

### Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## IDE Configuration

### IntelliJ IDEA

1. **Import Project**
   - File → Open → Select `pom.xml`
   - Choose "Open as Project"

2. **Configure JDK**
   - File → Project Structure → Project
   - Set SDK to Java 17

3. **Enable Lombok**
   - File → Settings → Plugins
   - Install "Lombok" plugin
   - Enable annotation processing:
     - Settings → Build, Execution, Deployment → Compiler → Annotation Processors
     - Check "Enable annotation processing"

4. **Configure Run Configuration**
   - Run → Edit Configurations → Add New → Spring Boot
   - Main class: `com.testcreator.TestCreatorApplication`
   - Active profiles: `local`
   - Environment variables: `DB_PASSWORD=your_password`

### VS Code

1. **Install Extensions**
   - Extension Pack for Java
   - Spring Boot Extension Pack
   - Lombok Annotations Support

2. **Configure `launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Spring Boot-TestCreatorApplication",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "mainClass": "com.testcreator.TestCreatorApplication",
      "projectName": "test-creator",
      "args": "",
      "envFile": "${workspaceFolder}/.env",
      "vmArgs": "-Dspring.profiles.active=local"
    }
  ]
}
```

---

## Testing Setup

### Run Unit Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=TestServiceTest

# Run with coverage report
mvn clean test jacoco:report

# View coverage report
# Open target/site/jacoco/index.html in browser
```

### Run Integration Tests

```bash
# Run integration tests
mvn verify -P integration-test

# Or use specific profile
mvn test -Dspring.profiles.active=test
```

---

## Frontend Development

### Serve Frontend Locally

The frontend is served as static files from `src/main/resources/static/`.

For development with live reload:

```bash
# Option 1: Use Spring Boot DevTools (auto-restart)
# Add to pom.xml:
# <dependency>
#   <groupId>org.springframework.boot</groupId>
#   <artifactId>spring-boot-devtools</artifactId>
#   <optional>true</optional>
# </dependency>

# Option 2: Use a simple HTTP server for frontend only
cd src/main/resources/static
python3 -m http.server 3000

# Then configure CORS to allow localhost:3000
```

---

## Environment Variables

### Required Environment Variables

```bash
# Database
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=testcreator
export DB_USERNAME=testcreator_user
export DB_PASSWORD=your_secure_password

# Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379

# JWT
export JWT_SECRET=your-256-bit-secret-key-minimum-32-characters-long
export JWT_EXPIRATION=86400000

# Application
export SPRING_PROFILES_ACTIVE=local
export SERVER_PORT=8080
```

### Create `.env` file

```bash
# .env (DO NOT COMMIT THIS FILE)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=your_secure_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
SPRING_PROFILES_ACTIVE=local
```

Add `.env` to `.gitignore`:

```
.env
.env.*
!.env.example
```

---

## Common Issues and Solutions

### Issue: Database Connection Failed

**Solution:**

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Check if port 5432 is listening
sudo netstat -tulpn | grep 5432

# Test connection
psql -h localhost -U testcreator_user -d testcreator
```

### Issue: Redis Connection Failed

**Solution:**

```bash
# Verify Redis is running
redis-cli ping

# Check Redis logs
sudo journalctl -u redis -f

# Restart Redis
sudo systemctl restart redis
```

### Issue: Port 8080 Already in Use

**Solution:**

```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>

# Or change application port
# In application.yml: server.port: 8081
```

### Issue: Maven Build Fails

**Solution:**

```bash
# Clear Maven cache
mvn clean

# Delete .m2 repository
rm -rf ~/.m2/repository

# Re-download dependencies
mvn clean install -U
```

### Issue: Lombok Not Working

**Solution:**

1. Install Lombok plugin in IDE
2. Enable annotation processing
3. Rebuild project
4. Invalidate caches and restart IDE

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

```bash
# Write code
# Write tests
# Run tests locally
mvn test
```

### 3. Commit Changes

```bash
git add .
git commit -m "feat: add feature description"
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

---

## Performance Testing Locally

### Using Apache JMeter

```bash
# Install JMeter
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xzf apache-jmeter-5.6.3.tgz
cd apache-jmeter-5.6.3/bin
./jmeter
```

### Using K6

```bash
# Install k6
brew install k6  # macOS
# or
curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz

# Run load test
k6 run load-test.js
```

---

## Monitoring in Development

### Enable Spring Boot Actuator

Access metrics at:

- Health: `http://localhost:8080/actuator/health`
- Metrics: `http://localhost:8080/actuator/metrics`
- Prometheus: `http://localhost:8080/actuator/prometheus`

### View Logs

```bash
# Application logs
tail -f logs/application.log

# Docker logs
docker-compose logs -f app
```

---

## Production Build

```bash
# Build production JAR
mvn clean package -P production

# Run production JAR
java -jar target/test-creator-0.0.1-SNAPSHOT.jar --spring.profiles.active=production

# Build Docker image
docker build -t test-creator:latest .

# Run Docker image
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=production \
  -e DB_HOST=your-db-host \
  test-creator:latest
```

---

## Next Steps

1. ✅ Complete local setup
2. ✅ Run application successfully
3. ✅ Create first test through API
4. ✅ Verify database records
5. ✅ Access frontend at http://localhost:8080
6. 📝 Start implementing Phase 1 features
7. 📝 Write unit tests
8. 📝 Setup CI/CD pipeline

---

## Support and Resources

- **Documentation**: See `TECHNICAL_DOCUMENTATION.md`
- **API Docs**: http://localhost:8080/swagger-ui.html
- **Database Schema**: See `database-schema.sql`
- **Issue Tracker**: GitHub Issues
- **Team Chat**: Slack/Discord

---

**Last Updated**: February 11, 2026  
**Version**: 1.0.0
