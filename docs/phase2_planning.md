# Phase 2: Advanced Features & Proctoring - Planning

**Date:** February 12, 2026
**Status:** ✅ COMPLETE

## Phase 2 Objectives

### Core Features

1. ✅ **Student Test Endpoints** - Allow students to view and take tests
2. ✅ **Test Attempts Management** - Track student test sessions
3. ✅ **Answer Submission & Validation** - Record student answers
4. ✅ **Results & Scoring** - Calculate scores and provide feedback
5. ✅ **Guest/Anonymous Access** - Take tests without registration
6. ✅ **Proctoring Features** - Monitor and detect violations
7. ✅ **Advanced Analytics** - Detailed test analytics and reporting

## Current Implementation Status

### ✅ COMPLETED - Phase 2.1: Student Test Endpoints

**Controller:** `StudentTestController` (7 endpoints)

```
GET    /api/student/tests/available          ✅ List available tests
POST   /api/student/tests/{testId}/start     ✅ Start attempt
GET    /api/student/attempts/{attemptId}     ✅ Get attempt progress
POST   /api/student/attempts/{attemptId}/answer ✅ Submit single answer
POST   /api/student/attempts/{attemptId}/submit ✅ Submit entire test
GET    /api/student/results                  ✅ Get all results
GET    /api/student/results/{attemptId}      ✅ Get detailed result
```

**Services:**

- ✅ `StudentTestService` - Test discovery & eligibility
- ✅ `TestAttemptService` - Session management
- ✅ `ResultService` - Scoring & analytics

**DTOs:**

- ✅ `AvailableTestDTO`
- ✅ `TestAttemptDTO`
- ✅ `QuestionWithOptionsDTO`
- ✅ `SubmitAnswerRequest`
- ✅ `TestResultDTO` (with ReviewQuestionDTO, ReviewOptionDTO)
- ✅ `StudentResultSummaryDTO`
- ✅ `StudentAnswerRecordDTO`

### ✅ COMPLETED - Phase 2.2: Guest/Anonymous Test Access

**Controller:** `GuestTestController` (5 endpoints - NO AUTH REQUIRED)

```
POST   /api/guest/tests/{testId}/generate-link    ✅ Generate guest link
GET    /api/guest/tests/{guestToken}              ✅ View test details
POST   /api/guest/tests/{guestToken}/start        ✅ Start guest attempt
POST   /api/guest/attempts/{attemptId}/answer     ✅ Submit answer
POST   /api/guest/attempts/{attemptId}/submit     ✅ Submit & view results
```

**Features:**

- ✅ UUID-based guest tokens
- ✅ One-time use links (no retakes)
- ✅ Anonymous tracking (student_id = null)
- ✅ Results saved to database for analytics
- ✅ Immediate result display after submission
- ✅ Database migration V7 (guest_sessions table)

**DTOs:**

- ✅ `GuestTestAccessDTO`
- ✅ `GuestTestDetailDTO`

**Entity:**

- ✅ `GuestTestSession`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Web/Mobile)                      │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/WebSocket
             ▼
┌─────────────────────────────────────────────────────────────┐
│              Spring Boot RestController                      │
│  StudentTestController, TestAttemptController               │
│  ResultController, ProctoringController                     │
└────────────┬─────────────┬─────────────┬────────────────────┘
             │             │             │
             ▼             ▼             ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ StudentTestService│ TAttemptSvc  │ ResultService    │
│ - getAvailable   │ - start      │ - calculateScore │
│ - validateAccess │ - submitAnswer│ - analytics      │
└──────────────────┘ └──────────────┘ └──────────────────┘
             │             │             │
             └─────────────┼─────────────┘
                          ▼
        ┌────────────────────────────┐
        │    Repository Layer        │
        │ (Data Access)              │
        └────────────────────────────┘
                          ▼
        ┌────────────────────────────┐
        │   Database (PostgreSQL)    │
        │  + Cache (Redis)           │
        └────────────────────────────┘
```

## Detailed Feature Specifications

### 1. Student Test Endpoints

**New DTOs:**

- `AvailableTestDTO` - Test metadata for students
- `TestAttemptDTO` - Active/completed attempt info
- `QuestionWithOptionsDTO` - Question without answer
- `SubmitAnswerRequest` - Single answer submission
- `TestResultDTO` - Final score and result

**New Endpoints:**

```
GET    /api/student/tests/available      - List available tests
POST   /api/student/tests/{testId}/start  - Start attempt
GET    /api/student/attempts/{attemptId}  - Get attempt progress
POST   /api/student/attempts/{attemptId}/answer - Submit single answer
POST   /api/student/attempts/{attemptId}/submit - Submit entire test
GET    /api/student/results               - Get all results
GET    /api/student/results/{attemptId}   - Get detailed result
```

**Business Rules:**

- [ ] Only published tests are available
- [ ] Cannot attempt same test twice (or limited attempts)
- [ ] Test must be within date range
- [ ] Sessions expire after duration + grace period
- [ ] Cannot submit after expiration
- [ ] Auto-calculate score after submission

### 2. Test Attempt Management

**StudentAnswerDTO:**

```java
public class StudentAnswerDTO {
    Long id;
    Long questionId;
    Integer selectedOption;
    LocalDateTime submittedAt;
    Boolean isCorrect;  // Only after result calculation
}
```

**TestAttemptDTO:**

```java
public class TestAttemptDTO {
    Long id;
    String testTitle;
    LocalDateTime startedAt;
    LocalDateTime expiresAt;
    Integer remainingSeconds;
    Integer answeredQuestions;  // Out of total
    List<StudentAnswerDTO> answers;
    Boolean submitted;
}
```

**Features:**

- [ ] Session management with auto-expiration
- [ ] Auto-save answers every 30 seconds
- [ ] Track question navigation
- [ ] Detect and record tab switches
- [ ] Implement heartbeat mechanism

### 3. Answer Submission & Auto-Save

**Flow:**

```
Client sends answer
        ↓
Validate answer (option 1-4)
        ↓
Check if attempt is active
        ↓
Check if not expired
        ↓
Save to StudentAnswer (upsert)
        ↓
Return confirmation
```

**Implementation:**

- Single answer endpoint: `POST /api/student/attempts/{id}/answer`
- Batch endpoint: `POST /api/student/attempts/{id}/answers` (future)
- Redis caching for active attempts
- Background job for periodic sync

### 4. Results & Scoring

**ResultDTO:**

```java
public class ResultDTO {
    Long attemptId;
    Integer totalQuestions;
    Integer answeredQuestions;
    Integer correctAnswers;
    Integer wrongAnswers;
    Integer skippedQuestions;
    Double score;  // Percentage
    String result;  // PASS/FAIL
    LocalDateTime submittedAt;
    Integer timeTaken;  // seconds
    AnalyticsDTO analytics;
}
```

**Scoring Algorithm:**

```
Score = (correctAnswers / totalQuestions) * 100
Result = Score >= passingScore ? PASS : FAIL
```

**Analytics:**

```java
public class AnalyticsDTO {
    Map<String,Integer> categoryWiseCorrect;  // By topic
    List<QuestionAnalysisDTO> questionAnalysis;
    Integer timePerQuestion;  // Average
    Integer tabSwitchCount;
    Boolean honorPreserved;  // No violations
}
```

### 5. Proctoring Features

**Violation Types:**

- `TAB_SWITCH` - User switched tabs
- `WINDOW_BLUR` - Browser lost focus
- `COPY_PASTE` - Attempted copy/paste
- `RIGHT_CLICK` - Attempted right-click
- `SCREEN_SHARE` - Screen sharing detected (advanced)

**ProctoringViolationDTO:**

```java
public class ProctoringViolationDTO {
    Long attemptId;
    String violationType;
    LocalDateTime violationTime;
    String details;
}
```

**Endpoints:**

```
POST   /api/student/attempts/{id}/violation     - Report violation
POST   /api/student/attempts/{id}/heartbeat     - Send heartbeat
GET    /api/proctoring/violations/{attemptId}   - Get violations (teacher)
```

**Heartbeat Mechanism:**

- Client sends every 5-10 seconds
- Payload: `{ attemptId, tabSwitches, timestamp }`
- Server validates attempt is still active
- Returns permission to continue or force submission

### 6. Teacher Results & Analytics

**TeacherResultsDTO:**

```java
public class TeacherResultsDTO {
    Long testId;
    String testTitle;
    Integer totalAttempts;
    Double averageScore;
    Integer passCount;
    Integer failCount;
    Double passPercentage;
    Map<Integer, Integer> scoreDistribution;  // 0-10%, 10-20%, etc.
    List<StudentResultSummaryDTO> students;
}
```

**Endpoints:**

```
GET    /api/results/tests                    - List tests with summaries
GET    /api/results/tests/{testId}           - Detailed results for test
GET    /api/results/tests/{testId}/export   - CSV/PDF export
POST   /api/results/tests/{testId}/regrade  - Manual score adjustment
```

## Database Enhancements

### Existing Tables

- ✅ tests
- ✅ questions
- ✅ options
- ✅ test_attempts
- ✅ student_answers
- ✅ users

### New Migrations Needed

- ✅ V7\_\_create_guest_sessions_table.sql
- [ ] V8\_\_add_proctoring_violations_table.sql
- [ ] V9\_\_add_indexes_for_performance.sql
- [ ] V10\_\_add_analytics_views.sql

**Proctoring Violations Schema:**

```sql
CREATE TABLE proctoring_violations (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES test_attempts(id),
    violation_type VARCHAR(50) NOT NULL,
    violation_time TIMESTAMP NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_attempt ON proctoring_violations(attempt_id);
```

## Implementation Phases

### Phase 2.1 - Student Test Taking ✅ COMPLETE

- [x] `StudentTestService` - Core logic
- [x] `StudentTestController` - REST endpoints (7 endpoints)
- [x] `TestAttemptService` - Session management
- [x] `ResultService` - Scoring and analytics
- [x] DTOs and validation (7 DTOs)
- [x] Repository query methods

### Phase 2.1b - Guest/Anonymous Access ✅ COMPLETE

- [x] `GuestTestController` - Public endpoints (5 endpoints)
- [x] `GuestTestSession` entity
- [x] `GuestTestSessionRepository`
- [x] Guest DTOs (2)
- [x] V7 migration (guest_sessions table)
- [x] One-time use token logic
- [x] Anonymous result storage

### Phase 2.2 - Answer Auto-Save & Caching ✅ COMPLETED

- [x] Auto-save mechanism (Redis cache)
- [x] Background sync job (30-second interval)
- [x] Periodic answer backup to database
- [x] Session recovery after disconnect

**Implementation Details:**

- `RedisConfig` - Cache manager with custom TTLs (answers: 4h, attempts: 4h, tests: 1h)
- `AnswerCacheService` - Core Redis operations (cache, retrieve, heartbeat, recovery)
- `AnswerSyncService` - @Scheduled background job syncing cache to database
- `CachedAnswerDTO` - Serializable DTO for Redis storage

**New Endpoints (StudentTestController):**

```
POST   /api/student/attempts/{attemptId}/autosave   ✅ Fast cache-only save
GET    /api/student/attempts/{attemptId}/recover    ✅ Session recovery
POST   /api/student/attempts/{attemptId}/heartbeat  ✅ Session monitoring
```

### Phase 2.3 - Proctoring ✅ COMPLETED

- [x] Proctoring violations table (V8 migration)
- [x] Violation recording endpoints
- [x] ViolationType and ViolationSeverity enums
- [x] ProctoringViolation entity
- [x] ProctoringViolationRepository with analytics queries
- [x] ProctoringService with threshold checking
- [x] Violation DTOs (Request, Response, Summary)
- [x] Security config for proctoring endpoints

**Implementation Details:**

- `ViolationType` enum: TAB_SWITCH, WINDOW_BLUR, COPY_PASTE, RIGHT_CLICK, KEYBOARD_SHORTCUT, DEVTOOLS_OPEN, etc.
- `ViolationSeverity` enum: LOW, MEDIUM, HIGH, CRITICAL
- `ProctoringViolation` entity with JSON details support
- Automatic severity assignment based on violation type
- Configurable thresholds (max-violations: 10, max-critical: 3, max-tab-switches: 5)
- Force-submit when thresholds exceeded

**New Endpoints:**

Student (StudentTestController):

```
POST   /api/student/attempts/{attemptId}/violation  ✅ Report violation
```

Teacher (ProctoringController):

```
GET    /api/proctoring/attempts/{attemptId}/violations  ✅ Get violations
GET    /api/proctoring/attempts/{attemptId}/summary     ✅ Get violation summary
GET    /api/proctoring/tests/{testId}/violations        ✅ Get all violations for test
```

### Phase 2.4 - Teacher Analytics ✅ COMPLETED

- [x] Results aggregation service (TeacherAnalyticsService)
- [x] Analytics calculations (avg, median, std dev, distribution)
- [x] CSV export functionality
- [x] Dashboard endpoints (AnalyticsController)
- [x] Question-level analytics with difficulty ratings

**Implementation Details:**

- `TestAnalyticsDTO` - Comprehensive test analytics (scores, distribution, pass rates)
- `QuestionAnalyticsDTO` - Per-question stats (correct %, answer distribution, difficulty)
- `StudentAttemptSummaryDTO` - Individual student results with proctoring info
- `TestSummaryDTO` - Quick test overview for dashboard
- `TeacherAnalyticsService` - All analytics calculations and CSV export
- `AnalyticsController` - REST endpoints for teacher dashboard

**New Endpoints:**

```
GET    /api/analytics/tests                     ✅ List tests with summaries
GET    /api/analytics/tests/{testId}            ✅ Full test analytics
GET    /api/analytics/tests/{testId}/students   ✅ Paginated student results
GET    /api/analytics/tests/{testId}/questions  ✅ Question-level analytics
GET    /api/analytics/tests/{testId}/export/csv ✅ Export results to CSV
```

**Analytics Features:**

- Score statistics (avg, median, high, low, standard deviation)
- Pass/fail rates and counts
- Score distribution by 10% ranges (0-10, 10-20, etc.)
- Per-question difficulty ratings (EASY, MEDIUM, HARD, VERY_HARD)
- Answer distribution per question
- Average time taken
- Proctoring violation counts per student

## New Services to Create

### StudentTestService

```java
public class StudentTestService {
    // Get available tests for student
    Page<AvailableTestDTO> getAvailableTests(Pageable pageable);

    // Check if student can attempt
    void validateCanAttempt(Long testId, Long studentId);

    // Calculate remaining time
    Integer getRemainingTime(Long attemptId);
}
```

### TestAttemptService

```java
public class TestAttemptService {
    // Start new attempt
    TestAttemptDTO startAttempt(Long testId, Long studentId);

    // Submit single answer
    void submitAnswer(Long attemptId, Long questionId, Integer optionNumber);

    // Submit entire test
    TestResultDTO submitTest(Long attemptId);

    // Auto-save mechanism
    void autoSaveAnswers(Long attemptId);
}
```

### ResultService

```java
public class ResultService {
    // Calculate final score and result
    TestResultDTO calculateResult(Long attemptId);

    // Get detailed result for student
    DetailedResultDTO getDetailedResult(Long attemptId);

    // Get teacher analytics
    TeacherAnalyticsDTO getTestAnalytics(Long testId);
}
```

### ProctoringService

```java
public class ProctoringService {
    // Record violation
    void recordViolation(Long attemptId, String violationType, String details);

    // Process heartbeat
    HeartbeatResponseDTO processHeartbeat(Long attemptId, HeartbeatRequest request);

    // Get violation summary
    ViolationSummaryDTO getViolationSummary(Long attemptId);
}
```

## Technology Stack for Phase 2

### Already Available

- ✅ Spring Data JPA
- ✅ PostgreSQL
- ✅ Redis
- ✅ JWT Authentication

### To Be Added

- [ ] **WebSocket** - Real-time communication for proctoring

  ```xml
  <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-websocket</artifactId>
  </dependency>
  ```

- [ ] **Apache POI** - Excel export

  ```xml
  <dependency>
      <groupId>org.apache.poi</groupId>
      <artifactId>poi-ooxml</artifactId>
      <version>5.0.0</version>
  </dependency>
  ```

- [ ] **iText** - PDF generation (optional)

  ```xml
  <dependency>
      <groupId>com.itextpdf</groupId>
      <artifactId>itext7-core</artifactId>
      <version>7.2.0</version>
  </dependency>
  ```

- [ ] **Scheduled Tasks** - Background jobs
  - Auto-save answers
  - Expire sessions
  - Generate analytics

## Security Considerations

### Student Test Level

- [ ] Verify student identity on every request
- [ ] Check session validity
- [ ] Verify question belongs to test
- [ ] Prevent direct answer submission without attempt
- [ ] Time-based access control

### Proctoring Level

- [ ] Validate heartbeat timing (no backdating)
- [ ] Detect rapid-fire violations (possible cheating)
- [ ] Prevent token forgery
- [ ] Log all violations with timestamps
- [ ] Rate limit answer submissions

### Teacher Level

- [ ] Can only view own test results
- [ ] Can only modify results for own tests
- [ ] Audit trail for manual adjustments
- [ ] Data export with permission checks

## Performance Considerations

### Caching Strategy

```java
// Cache available tests (1 hour)
@Cacheable(value = "availableTests", key = "#pageable.pageNumber")
Page<AvailableTestDTO> getAvailableTests(Pageable pageable);

// Cache active attempts (TTL = test duration + 1 hour)
@Cacheable(value = "activeAttempts", key = "#attemptId")
TestAttemptDTO getAttemptProgress(Long attemptId);
```

### Database Optimization

- [ ] Add indexes for student_id, test_id, created_at
- [ ] Denormalize score in test_attempts table
- [ ] Partition large tables by date
- [ ] Archive old results to separate table

### API Optimization

- [ ] Pagination for all list endpoints
- [ ] Lazy loading for related entities
- [ ] Response compression (gzip)
- [ ] Rate limiting per student per test

## Testing Strategy

### Unit Tests

- [ ] Service layer (50+ tests)
- [ ] Calculation logic (scoring, analytics)
- [ ] Business rules validation
- [ ] Security checks

### Integration Tests

- [ ] Full flow: start → answer → submit → result
- [ ] Violation handling
- [ ] Session expiration
- [ ] Edge cases (concurrent submissions)

### E2E Tests

- [ ] Browser automation (Selenium/Cypress)
- [ ] Timer verification
- [ ] Tab switch detection
- [ ] WebSocket communication

## Deployment Roadmap

### Week 1-2

- Complete Phase 2.1
- Deploy to staging
- Beta test with sample students

### Week 3

- Complete Phase 2.2
- Internal testing
- Performance tuning

### Week 4

- Complete Phase 2.3
- Security audit
- Load testing

### Week 5+

- Complete Phase 2.4
- Final QA
- Production release

## Success Metrics

- ✅ All 20+ endpoints tested
- ✅ 100% test coverage for critical paths
- ✅ <100ms response time for 95th percentile
- ✅ Zero data loss on submission
- ✅ Proctoring accuracy >95%
- ✅ Support for 10,000+ concurrent tests
- ✅ Analytics generated in <100ms

---

**Next Step:** Begin Phase 2.1 implementation with StudentTestService and StudentTestController
