# Architecture Overview

## Frontend Architecture

The frontend uses **expo-router** (file-based routing). Currently only has a landing page:

- `frontend/app/_layout.tsx` — root Stack navigator with dark/light theme support
- `frontend/app/index.tsx` — entry point, renders `LandingPage`
- `frontend/src/screens/LandingPage.tsx` — marketing landing page with responsive layout using `useWindowDimensions` breakpoints (`>768` medium, `>1024` large)
- `frontend/components/` — generic Expo template components (theming helpers)
- `frontend/src/theme/` — color/theme tokens

**Styling**: uses React Native `StyleSheet` (not NativeWind/Tailwind). Responsive patterns use `isLargeScreen`/`isMediumScreen` boolean props applied via conditional style arrays.

**Web + Mobile**: `Platform.select()` is used for platform-specific shadows. The web build is exported via Expo and served by Spring Boot as static files from `backend/src/main/resources/static/`. Spring Boot's `WebConfig` forwards non-API paths to `index.html` for client-side routing.

---

## Backend Architecture

### Key Patterns

**Read/Write Splitting**: Use `@Transactional` for writes, `@Transactional(readOnly = true)` for queries.

**Caching Strategy** (Redis):
- Tests: 2 hours | Questions: 4 hours | User profiles: 30 minutes | Results: 1 hour
- **Never cache**: Active test attempts, proctoring violations

**Entity Cascade**: Always use `cascade = CascadeType.ALL, orphanRemoval = true` for parent-child relationships (Test→Questions→Options).

```java
@Service
@RequiredArgsConstructor
public class TestService {

    @Transactional
    public TestDTO createTest(CreateTestRequest request) { ... }

    @Transactional(readOnly = true)
    @Cacheable(value = "tests", key = "#testId")
    public TestDTO getTest(Long testId) { ... }

    @Transactional
    @CacheEvict(value = "tests", key = "#testId")
    public TestDTO updateTest(Long testId, UpdateTestRequest request) { ... }
}
```

### Answer Submission Pipeline

Answer saves use a **dual-write pattern** for durability without sacrificing throughput:

1. `POST /api/student/attempts/{id}/answer` → writes to PostgreSQL via native upsert AND caches to Redis
2. `AnswerSyncService` runs every 30 seconds (`@Scheduled`) and syncs unsynced Redis answers to PostgreSQL
3. `AnswerSyncService.syncAllBeforeSubmit()` is called before final submission to flush all cached answers

**Redis key schema** (all with 4-hour TTL):
- `answer:{attemptId}:{questionId}` → `CachedAnswerDTO`
- `attempt_answers:{attemptId}` → Set of questionIds answered
- `attempt_session:{attemptId}` → Hash with session metadata and last heartbeat

**Database upsert** (`StudentAnswerRepository.upsertAnswer`): Uses native PostgreSQL `ON CONFLICT (attempt_id, question_id) DO UPDATE` to avoid race conditions on concurrent writes.

### Guest vs. Authenticated Test Flow

**Authenticated students** (`/api/student/**`) — go through `StudentTestController` → `TestAttemptService`. The `TestAttempt` has `student != null`.

**Guests** (`/api/guest/**`) — handled entirely in `GuestTestController` (fat controller — business logic lives in the controller). The `TestAttempt` has `student == null` with `guestName` and `guestToken` fields.

Guest access flow:
1. Teacher generates access code on a `Test` (V9 migration added `access_code` column)
2. Guest hits `GET /api/guest/access/{accessCode}` → auto-creates a `GuestTestSession` with a UUID `guestToken`
3. If the guest wants a different code, `DELETE /api/guest/sessions/{guestToken}` deletes the unused session (only if `isUsed = false`)
4. Guest uses `guestToken` for all subsequent calls (`/api/guest/tests/{guestToken}`, `/api/guest/tests/{guestToken}/start`)
5. Guest answers use option IDs (`selectedOptionId`) rather than option numbers (1-3)

### Options Constraint

Questions have exactly **3 options** (enforced by V11 migration). Option numbers are 1, 2, or 3. Authenticated submissions validate `selectedOption` is in [1, 3]. Options are **shuffled randomly** on every attempt fetch (prevents memorizing answer positions).

---

## Security Configuration

**Roles**: `TEACHER` (create/manage tests), `STUDENT` (take tests), `ADMIN`

**Public endpoints**: `/api/auth/**`, `/api/guest/**`, `/actuator/health`, `/swagger-ui/**`

**Password encoding**: BCrypt with cost factor 12

JWT token lifetimes: access token 24 hours, refresh token 7 days (`jwt.expiration` / `jwt.refresh-expiration`).

Rate limiting (`app.rate-limit.*`): 1000 req/hr default, 5 req/min for auth endpoints.

---

## Key Domain Concepts

| Concept | Description |
|---------|-------------|
| **Test** | Exam created by teacher with questions (each with 3 options), duration, passing score, optional `accessCode` for guest access |
| **TestAttempt** | Student's test session — authenticated (`student` set) or guest (`student` null, `guestToken` + `guestName` set) |
| **GuestTestSession** | One-time-use token linking a guest to a specific test; marked `isUsed = true` on test start |
| **ProctoringViolation** | Tab switches, copy attempts, browser focus loss (configurable via `proctoring.*` properties) |
| **AnswerCacheService** | Redis-based fast-path for answer writes; `AnswerSyncService` handles background DB persistence |
| **ResultService** | Grades submissions by comparing `StudentAnswer.selectedOption` against `Option.isCorrect` |
| **StudentTestService** | Fetches available (published) tests for students with pagination |
| **TeacherAnalyticsService** | Per-test statistics (`/api/analytics/**`): score distributions, pass rates |
| **CsvQuestionParser** | Bulk question import via `POST /api/tests/{id}/import-csv` |

### Performance Note

`AnswerSyncService.syncCachedAnswersToDatabase()` calls `testAttemptRepository.findAll()` and filters to `IN_PROGRESS` in memory. At high load, replace with `findByStatus(IN_PROGRESS)` to avoid a full table scan every 30 seconds.

---

See [architectural_decisions.md](architectural_decisions.md) for ADRs on technology choices.
