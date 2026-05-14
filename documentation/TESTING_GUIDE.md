# Testing Guide - Phase 1 Authentication

This guide helps you test the authentication system that's now implemented.

## 🚀 Quick Start

### 1. Start the Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (check with docker ps)
```

### 2. Set Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# The default values should work for local development
```

### 3. Run the Application

```bash
# Clean build and run
mvn clean install -DskipTests
mvn spring-boot:run
```

The application will start on **http://localhost:8080**

### 4. Verify Application is Running

```bash
# Check health endpoint
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}
```

## 📝 Testing Authentication

### Access Swagger UI

Open your browser and navigate to:
```
http://localhost:8080/swagger-ui.html
```

### Test 1: Register a Teacher

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "teacher@example.com",
  "password": "Teacher123",
  "name": "John Teacher",
  "role": "TEACHER"
}
```

**Expected Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "user": {
    "id": 1,
    "email": "teacher@example.com",
    "name": "John Teacher",
    "role": "TEACHER",
    "active": true,
    "createdAt": "2026-02-11T..."
  }
}
```

**Using cURL:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Teacher123",
    "name": "John Teacher",
    "role": "TEACHER"
  }'
```

### Test 2: Register a Student

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "Student123",
  "name": "Alice Student",
  "role": "STUDENT"
}
```

### Test 3: Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "teacher@example.com",
  "password": "Teacher123"
}
```

**Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "user": {
    "id": 1,
    "email": "teacher@example.com",
    "name": "John Teacher",
    "role": "TEACHER",
    "active": true
  }
}
```

**Using cURL:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "Teacher123"
  }'
```

### Test 4: Get Current User (Authenticated)

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <your-token-here>
```

**Using cURL:**
```bash
# Replace <TOKEN> with the actual token from login response
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "email": "teacher@example.com",
  "name": "John Teacher",
  "role": "TEACHER",
  "active": true,
  "createdAt": "2026-02-11T..."
}
```

## 🧪 Testing Error Cases

### Invalid Email Format
```json
{
  "email": "invalid-email",
  "password": "Teacher123",
  "name": "Test User",
  "role": "TEACHER"
}
```
**Expected:** 400 Bad Request

### Weak Password
```json
{
  "email": "test@example.com",
  "password": "weak",
  "name": "Test User",
  "role": "TEACHER"
}
```
**Expected:** 400 Bad Request
**Message:** "Password must be at least 8 characters long"

### Duplicate Email
Register the same email twice.
**Expected:** 409 Conflict
**Message:** "Email already registered: ..."

### Invalid Credentials
```json
{
  "email": "teacher@example.com",
  "password": "WrongPassword123"
}
```
**Expected:** 401 Unauthorized
**Message:** "Invalid email or password"

### Missing JWT Token
Try to access `/api/auth/me` without Authorization header.
**Expected:** 403 Forbidden

## 🔍 Database Verification

Connect to PostgreSQL and verify data:

```bash
# Connect to database
docker exec -it testcreator-postgres psql -U testcreator_user -d testcreator

# Check users table
SELECT id, email, name, role, active, created_at FROM users;

# Verify password is hashed
SELECT email, substring(password, 1, 10) as password_hash FROM users;

# Exit
\q
```

## 📊 Monitoring

### Check Application Logs

```bash
# Follow logs while testing
mvn spring-boot:run

# Look for:
# - "User registered successfully: ..."
# - "User logged in successfully: ..."
# - Any error messages
```

### Check Metrics

```bash
# Prometheus metrics
curl http://localhost:8080/actuator/prometheus

# Health check
curl http://localhost:8080/actuator/health
```

## ✅ Success Criteria

- [x] Application starts without errors
- [x] Database migrations run successfully
- [x] Teacher registration succeeds
- [x] Student registration succeeds
- [x] Login with correct credentials works
- [x] JWT token is generated
- [x] Authenticated endpoint (/api/auth/me) works with valid token
- [x] Proper error messages for invalid input
- [x] Passwords are hashed in database
- [x] Swagger UI is accessible

## 🐛 Troubleshooting

### Application Won't Start

1. **Check database is running:**
   ```bash
   docker ps | grep postgres
   ```

2. **Check database connection:**
   ```bash
   docker exec testcreator-postgres pg_isready -U testcreator_user
   ```

3. **Check logs for errors:**
   ```bash
   mvn spring-boot:run
   # Look for stack traces or connection errors
   ```

### Database Migration Errors

```bash
# Clean database and start fresh
docker-compose down -v
docker-compose up -d postgres redis
mvn spring-boot:run
```

### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

## 📝 Next Steps

With authentication working, you can now:

1. **Add Test Management** - CRUD operations for tests (Phase 1 remaining)
2. **Add Student Test-Taking** - Start test, submit answers
3. **Add Results Viewing** - View scores and analytics
4. **Add Proctoring** - Browser-based security features (Phase 2)

## 🎯 Current API Endpoints

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | `/api/auth/register` | No | - | Register new user |
| POST | `/api/auth/login` | No | - | Login |
| GET | `/api/auth/me` | Yes | Any | Get current user info |

---

**Date:** February 11, 2026
**Phase:** 1 - MVP Foundation
**Status:** Authentication Complete ✅
