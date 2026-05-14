# API Reference Documentation

## Base URL
- Development: `http://localhost:8080/api`
- Production: `https://api.testcreator.com/api`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "STUDENT"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "STUDENT",
  "createdAt": "2026-02-11T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `409 Conflict` - Email already exists

---

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "STUDENT"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account inactive

---

### POST /auth/refresh
Refresh an expired JWT token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

---

### POST /auth/logout
Invalidate current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

---

### GET /auth/me
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "STUDENT",
  "active": true,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

---

## Test Management Endpoints (Teacher)

### POST /tests
Create a new test.

**Authorization:** TEACHER role required

**Request Body:**
```json
{
  "title": "Java Fundamentals Quiz",
  "description": "Test covering Java basics",
  "totalQuestions": 10,
  "passingScore": 70,
  "durationMinutes": 30,
  "testDate": "2026-02-20T10:00:00Z",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "What is Java?",
      "explanation": "Java is a programming language and computing platform.",
      "correctOptionNumber": 1,
      "options": [
        {
          "optionNumber": 1,
          "optionText": "A programming language"
        },
        {
          "optionNumber": 2,
          "optionText": "A coffee brand"
        },
        {
          "optionNumber": 3,
          "optionText": "An island"
        },
        {
          "optionNumber": 4,
          "optionText": "All of the above"
        }
      ]
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "title": "Java Fundamentals Quiz",
  "description": "Test covering Java basics",
  "totalQuestions": 10,
  "passingScore": 70,
  "durationMinutes": 30,
  "testDate": "2026-02-20T10:00:00Z",
  "status": "DRAFT",
  "createdBy": {
    "id": 1,
    "name": "John Teacher",
    "email": "teacher@example.com"
  },
  "createdAt": "2026-02-11T10:00:00Z"
}
```

**Validation Rules:**
- `title`: Required, 5-500 characters
- `totalQuestions`: Required, 1-100
- `passingScore`: Required, 0-100
- `durationMinutes`: Required, 5-240
- `questions.length`: Must equal `totalQuestions`
- Each question must have exactly 4 options

---

### GET /tests
Get all tests created by the teacher.

**Authorization:** TEACHER role required

**Query Parameters:**
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 10)
- `status` (optional): Filter by status (DRAFT, PUBLISHED, ARCHIVED)
- `sort` (optional): Sort field (title, testDate, createdAt)
- `direction` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/tests?page=0&size=20&status=PUBLISHED&sort=testDate&direction=DESC
```

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": 1,
      "title": "Java Fundamentals Quiz",
      "totalQuestions": 10,
      "testDate": "2026-02-20T10:00:00Z",
      "status": "PUBLISHED",
      "createdAt": "2026-02-11T10:00:00Z",
      "attemptCount": 15
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 50,
  "totalPages": 3,
  "last": false,
  "first": true
}
```

---

### GET /tests/{id}
Get test details by ID.

**Authorization:** TEACHER role required (must be creator)

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Java Fundamentals Quiz",
  "description": "Test covering Java basics",
  "totalQuestions": 10,
  "passingScore": 70,
  "durationMinutes": 30,
  "testDate": "2026-02-20T10:00:00Z",
  "status": "PUBLISHED",
  "createdBy": {
    "id": 1,
    "name": "John Teacher",
    "email": "teacher@example.com"
  },
  "questions": [
    {
      "id": 1,
      "questionNumber": 1,
      "questionText": "What is Java?",
      "explanation": "Java is a programming language.",
      "correctOptionNumber": 1,
      "options": [
        {
          "id": 1,
          "optionNumber": 1,
          "optionText": "A programming language"
        }
      ]
    }
  ],
  "createdAt": "2026-02-11T10:00:00Z",
  "updatedAt": "2026-02-11T10:00:00Z"
}
```

---

### PUT /tests/{id}
Update an existing test.

**Authorization:** TEACHER role required (must be creator)

**Note:** Can only update tests in DRAFT status

**Request Body:** Same as POST /tests

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Updated Java Quiz",
  "status": "DRAFT",
  "updatedAt": "2026-02-11T11:00:00Z"
}
```

**Error Responses:**
- `403 Forbidden` - Cannot edit published test
- `404 Not Found` - Test not found

---

### DELETE /tests/{id}
Delete a test.

**Authorization:** TEACHER role required (must be creator)

**Note:** Can only delete tests with no attempts

**Response:** `204 No Content`

**Error Responses:**
- `409 Conflict` - Test has attempts, cannot delete

---

### POST /tests/{id}/publish
Publish a test (make it available to students).

**Authorization:** TEACHER role required

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "PUBLISHED",
  "publishedAt": "2026-02-11T12:00:00Z"
}
```

---

### POST /tests/{id}/archive
Archive a test.

**Authorization:** TEACHER role required

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "ARCHIVED",
  "archivedAt": "2026-02-11T12:00:00Z"
}
```

---

## Student Test Endpoints

### GET /student/tests/available
Get list of available tests for the student.

**Authorization:** STUDENT role required

**Query Parameters:**
- `page` (optional): Page number
- `size` (optional): Page size

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": 1,
      "title": "Java Fundamentals Quiz",
      "description": "Test covering Java basics",
      "totalQuestions": 10,
      "durationMinutes": 30,
      "testDate": "2026-02-20T10:00:00Z",
      "alreadyAttempted": false,
      "teacherName": "John Teacher"
    }
  ],
  "totalElements": 5,
  "totalPages": 1
}
```

---

### POST /student/tests/{testId}/start
Start a test attempt.

**Authorization:** STUDENT role required

**Response:** `201 Created`
```json
{
  "attemptId": 101,
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "totalQuestions": 10,
  "durationMinutes": 30,
  "startedAt": "2026-02-20T10:05:00Z",
  "expiresAt": "2026-02-20T10:35:00Z",
  "questions": [
    {
      "id": 1,
      "questionNumber": 1,
      "questionText": "What is Java?",
      "options": [
        {
          "optionNumber": 1,
          "optionText": "A programming language"
        },
        {
          "optionNumber": 2,
          "optionText": "A coffee brand"
        },
        {
          "optionNumber": 3,
          "optionText": "An island"
        },
        {
          "optionNumber": 4,
          "optionText": "All of the above"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `409 Conflict` - Already attempted this test
- `400 Bad Request` - Test not yet available

---

### GET /student/attempts/{attemptId}
Get current test attempt progress.

**Authorization:** STUDENT role required (must be owner)

**Response:** `200 OK`
```json
{
  "attemptId": 101,
  "testTitle": "Java Fundamentals Quiz",
  "startedAt": "2026-02-20T10:05:00Z",
  "expiresAt": "2026-02-20T10:35:00Z",
  "remainingMinutes": 25,
  "answeredQuestions": 5,
  "totalQuestions": 10,
  "status": "IN_PROGRESS"
}
```

---

### POST /student/attempts/{attemptId}/answer
Submit an answer for a question.

**Authorization:** STUDENT role required (must be owner)

**Request Body:**
```json
{
  "questionId": 1,
  "selectedOption": 1
}
```

**Response:** `200 OK`
```json
{
  "questionId": 1,
  "selectedOption": 1,
  "saved": true,
  "timestamp": "2026-02-20T10:10:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid option number
- `409 Conflict` - Attempt already submitted

---

### POST /student/attempts/{attemptId}/submit
Submit the entire test.

**Authorization:** STUDENT role required (must be owner)

**Response:** `200 OK`
```json
{
  "attemptId": 101,
  "testTitle": "Java Fundamentals Quiz",
  "submittedAt": "2026-02-20T10:30:00Z",
  "totalQuestions": 10,
  "answeredQuestions": 10,
  "score": 80,
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "result": "PASS",
  "passingScore": 70
}
```

---

### GET /student/results
Get all test results for the student.

**Authorization:** STUDENT role required

**Response:** `200 OK`
```json
{
  "results": [
    {
      "attemptId": 101,
      "testId": 1,
      "testTitle": "Java Fundamentals Quiz",
      "score": 80,
      "result": "PASS",
      "submittedAt": "2026-02-20T10:30:00Z"
    }
  ],
  "totalAttempts": 5,
  "averageScore": 75.5,
  "passCount": 4,
  "failCount": 1
}
```

---

### GET /student/results/{attemptId}
Get detailed result for a specific attempt.

**Authorization:** STUDENT role required (must be owner)

**Response:** `200 OK`
```json
{
  "attemptId": 101,
  "testTitle": "Java Fundamentals Quiz",
  "score": 80,
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "result": "PASS",
  "passingScore": 70,
  "submittedAt": "2026-02-20T10:30:00Z",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "What is Java?",
      "selectedOption": 1,
      "correctOption": 1,
      "isCorrect": true,
      "explanation": "Java is a programming language.",
      "options": [
        {
          "optionNumber": 1,
          "optionText": "A programming language",
          "isCorrect": true,
          "wasSelected": true
        }
      ]
    },
    {
      "questionNumber": 2,
      "questionText": "What is JVM?",
      "selectedOption": 1,
      "correctOption": 2,
      "isCorrect": false,
      "explanation": "JVM stands for Java Virtual Machine.",
      "options": [
        {
          "optionNumber": 1,
          "optionText": "Java Virtual Monitor",
          "isCorrect": false,
          "wasSelected": true
        },
        {
          "optionNumber": 2,
          "optionText": "Java Virtual Machine",
          "isCorrect": true,
          "wasSelected": false
        }
      ]
    }
  ]
}
```

---

## Guest Test Endpoints (No Authentication Required)

All guest endpoints are publicly accessible — no JWT token is needed.

### GET /guest/access/{accessCode}

Look up a published test by its access code and auto-create a guest session.

**Response:** `200 OK`

```json
{
  "guestToken": "guest_550e8400-e29b-41d4-a716-446655440000",
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "guestAccessUrl": "http://localhost:8080/api/guest/tests/guest_550e8400...",
  "expirationMinutes": 1440
}
```

**Error Responses:**

- `404 Not Found` - No published test found with this access code

---

### GET /guest/tests/{guestToken}

Get test details using a guest session token.

**Response:** `200 OK`

```json
{
  "guestToken": "guest_550e8400...",
  "testId": 1,
  "title": "Java Fundamentals Quiz",
  "description": "Test covering Java basics",
  "totalQuestions": 10,
  "durationMinutes": 30,
  "passingScore": 70
}
```

**Error Responses:**

- `400 Bad Request` - Invalid or expired guest token

---

### DELETE /guest/sessions/{guestToken}

Invalidate (delete) an unused guest session. Called when a guest clicks "Different Code" to discard
the auto-created session and start fresh.

**Response:** `204 No Content`

**Error Responses:**

- `400 Bad Request` - Cannot invalidate a session that has already been used to start a test
- `404 Not Found` - Guest session not found

**Notes:**

- Only unused sessions (test not yet started) can be invalidated
- Sessions that have already been used to start a test cannot be deleted

---

### POST /guest/tests/{guestToken}/start

Start a guest test attempt.

**Request Body:**

```json
{
  "guestName": "John Doe"
}
```

**Response:** `201 Created`

```json
{
  "id": 101,
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "guestName": "John Doe",
  "startedAt": "2026-02-15T10:05:00",
  "expiresAt": "2026-02-15T10:35:00",
  "remainingMinutes": 30,
  "totalQuestions": 10,
  "status": "IN_PROGRESS",
  "questions": [
    ...
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid token or already used

---

### GET /guest/attempts/{attemptId}

Get a guest attempt's details and progress.

**Response:** `200 OK`

**Error Responses:**

- `400 Bad Request` - Not a guest attempt
- `404 Not Found` - Attempt not found

---

### POST /guest/attempts/{attemptId}/answer

Submit an answer for a question during a guest test.

**Request Body:**

```json
{
  "questionId": 1,
  "selectedOptionId": 3
}
```

**Response:** `200 OK`

**Error Responses:**

- `400 Bad Request` - Invalid answer, session expired, or attempt not active
- `404 Not Found` - Attempt, question, or option not found

---

### POST /guest/attempts/{attemptId}/submit

Submit the guest test for grading.

**Response:** `200 OK`

```json
{
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "score": 80.0,
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "result": "PASS",
  "passingScore": 70
}
```

**Error Responses:**

- `400 Bad Request` - Attempt cannot be submitted (not a guest attempt or not in progress)
- `404 Not Found` - Attempt not found

---

## Results Endpoints (Teacher)

### GET /results/tests
Get list of tests with result summaries.

**Authorization:** TEACHER role required

**Response:** `200 OK`
```json
{
  "tests": [
    {
      "testId": 1,
      "testTitle": "Java Fundamentals Quiz",
      "testDate": "2026-02-20T10:00:00Z",
      "totalAttempts": 25,
      "averageScore": 75.5,
      "passCount": 20,
      "failCount": 5,
      "passPercentage": 80.0
    }
  ]
}
```

---

### GET /results/tests/{testId}
Get detailed results for a specific test.

**Authorization:** TEACHER role required (must be creator)

**Query Parameters:**
- `page` (optional): Page number
- `size` (optional): Page size
- `result` (optional): Filter by result (PASS, FAIL)
- `sort` (optional): Sort field (score, submittedAt, studentName)

**Response:** `200 OK`
```json
{
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "results": [
    {
      "attemptId": 101,
      "studentId": 10,
      "studentName": "Alice Smith",
      "studentEmail": "alice@example.com",
      "score": 85,
      "correctAnswers": 17,
      "wrongAnswers": 3,
      "result": "PASS",
      "submittedAt": "2026-02-20T10:35:00Z",
      "tabSwitchCount": 0
    }
  ],
  "analytics": {
    "totalAttempts": 25,
    "averageScore": 75.5,
    "medianScore": 77.0,
    "minScore": 45,
    "maxScore": 95,
    "standardDeviation": 12.3,
    "passPercentage": 80.0,
    "questionAnalytics": [
      {
        "questionNumber": 1,
        "totalAttempts": 25,
        "correctCount": 22,
        "successRate": 88.0
      }
    ]
  },
  "totalElements": 25,
  "totalPages": 3
}
```

---

### GET /results/tests/{testId}/export
Export test results to CSV.

**Authorization:** TEACHER role required (must be creator)

**Response:** `200 OK`
Content-Type: `text/csv`
Content-Disposition: `attachment; filename="test-results-1.csv"`

```csv
Student Name,Email,Score,Result,Submitted At
Alice Smith,alice@example.com,85,PASS,2026-02-20T10:35:00Z
Bob Jones,bob@example.com,65,FAIL,2026-02-20T10:40:00Z
```

---

## Proctoring Endpoints

### POST /student/attempts/{attemptId}/violation
Report a proctoring violation.

**Authorization:** STUDENT role required

**Request Body:**
```json
{
  "violationType": "TAB_SWITCH",
  "violationMessage": "User switched to another tab",
  "timestamp": "2026-02-20T10:15:00Z"
}
```

**Response:** `200 OK`
```json
{
  "recorded": true
}
```

---

### POST /student/attempts/{attemptId}/heartbeat
Send periodic heartbeat during test.

**Authorization:** STUDENT role required

**Request Body:**
```json
{
  "attemptId": 101,
  "tabSwitches": 0,
  "timestamp": "2026-02-20T10:20:00Z"
}
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "continueTest": true
}
```

---

## Question Bank Endpoints (Future)

### POST /question-bank
Add question to question bank.

**Authorization:** TEACHER role required

**Request Body:**
```json
{
  "subject": "Java",
  "topic": "OOP Concepts",
  "difficulty": "MEDIUM",
  "questionText": "What is inheritance?",
  "explanation": "Inheritance is a mechanism in OOP...",
  "correctOptionNumber": 1,
  "options": [
    {"optionNumber": 1, "optionText": "Code reusability"},
    {"optionNumber": 2, "optionText": "Data hiding"},
    {"optionNumber": 3, "optionText": "Polymorphism"},
    {"optionNumber": 4, "optionText": "Encapsulation"}
  ],
  "tags": ["java", "oop", "inheritance"]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "timestamp": "2026-02-11T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/tests",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

API requests are rate-limited per user:
- **Authenticated users**: 1000 requests per hour
- **Per endpoint limits**:
  - POST /auth/login: 5 requests per minute
  - POST /tests: 10 requests per minute
  - POST /student/attempts/{id}/answer: 100 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2026-02-11T11:00:00Z
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (0-indexed)
- `size`: Items per page (default: 10, max: 100)
- `sort`: Sort field
- `direction`: Sort direction (ASC, DESC)

**Response Format:**
```json
{
  "content": [...],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {...}
  },
  "totalElements": 100,
  "totalPages": 10,
  "first": true,
  "last": false,
  "number": 0,
  "size": 10
}
```

---

## Webhooks (Future Feature)

Configure webhooks to receive notifications:

**Events:**
- `test.published` - When a test is published
- `test.submitted` - When a student submits a test
- `violation.detected` - When proctoring violation occurs

---

**Last Updated**: February 15, 2026
**API Version**: v1
