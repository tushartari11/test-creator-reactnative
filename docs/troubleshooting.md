# Troubleshooting Guide

This document covers common issues encountered during development and their resolutions.

---

## Table of Contents

1. [Hibernate/JPA Issues](#hibernatejpa-issues)
   - [LazyInitializationException](#1-lazyinitializationexception)
   - [MultipleBagFetchException](#2-multiplebagfetchexception)
2. [Docker Issues](#docker-issues)
   - [App Cannot Connect to PostgreSQL](#3-app-cannot-connect-to-postgresql)
3. [Frontend-Backend Integration Issues](#frontend-backend-integration-issues)
   - [Field Name Mismatch](#4-field-name-mismatch)
   - [Guest API Methods Missing](#5-guest-api-methods-missing)
   - [Validation Failed on Answer Submission](#6-validation-failed-on-answer-submission)
4. [Security Issues](#security-issues)
   - [User Not Found in Guest Flow](#7-user-not-found-in-guest-flow)
   - [403 Forbidden for Static Resources](#8-403-forbidden-for-static-resources)

---

## Hibernate/JPA Issues

### 1. LazyInitializationException

**Error Message:**

```
org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role:
com.testcreator.entity.Test.questions, could not initialize proxy - no Session
```

**Cause:**
Accessing a lazily-loaded collection (like `test.getQuestions()`) outside of an active Hibernate session. This typically happens when:

- The entity is detached from the persistence context
- The transaction has already been committed
- Accessing relationships in a controller after the service method returns

**Bad Code Example:**

```java
@GetMapping("/tests/{guestToken}/start")
public ResponseEntity<TestAttemptDTO> startGuestTest(@PathVariable String guestToken) {
    GuestTestSession session = guestSessionRepository.findValidByGuestToken(guestToken)
            .orElseThrow(() -> new BusinessException("Invalid token"));

    Test test = session.getTest();  // Only has proxy, not actual data

    // This will throw LazyInitializationException!
    List<Question> questions = test.getQuestions();
}
```

**Solution:**
Use `JOIN FETCH` in your repository query to eagerly load the required associations:

**Step 1:** Create a custom repository method with JOIN FETCH:

```java
// In TestRepository.java
@Query("SELECT t FROM Test t " +
       "LEFT JOIN FETCH t.questions q " +
       "LEFT JOIN FETCH q.options " +
       "WHERE t.id = :testId")
Optional<Test> findByIdWithQuestionsAndOptions(@Param("testId") Long testId);
```

**Step 2:** Use the new method in your service/controller:

```java
@GetMapping("/tests/{guestToken}/start")
public ResponseEntity<TestAttemptDTO> startGuestTest(@PathVariable String guestToken) {
    GuestTestSession session = guestSessionRepository.findValidByGuestToken(guestToken)
            .orElseThrow(() -> new BusinessException("Invalid token"));

    // Fetch test with all associations eagerly loaded
    Test test = testRepository.findByIdWithQuestionsAndOptions(session.getTest().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    // Now this works - questions are already loaded
    Set<Question> questions = test.getQuestions();
}
```

**Alternative Solutions:**

1. Use `@Transactional` on the method (keeps session open)
2. Use `@EntityGraph` annotation
3. Configure `spring.jpa.open-in-view=true` (not recommended for production)

---

### 2. MultipleBagFetchException

**Error Message:**

```
org.hibernate.loader.MultipleBagFetchException: cannot simultaneously fetch multiple bags:
[com.testcreator.entity.Test.questions, com.testcreator.entity.Question.options]
```

**Cause:**
Hibernate cannot fetch multiple collections of type `List` in a single query because it can lead to a Cartesian product problem.

**Bad Code Example:**

```java
@Entity
public class Test {
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL)
    private List<Question> questions = new ArrayList<>();  // BAG type
}

@Entity
public class Question {
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private List<Option> options = new ArrayList<>();  // Another BAG type
}

// This query will fail:
@Query("SELECT t FROM Test t " +
       "LEFT JOIN FETCH t.questions q " +
       "LEFT JOIN FETCH q.options " +
       "WHERE t.id = :testId")
Optional<Test> findByIdWithQuestionsAndOptions(@Param("testId") Long testId);
```

**Solution:**
Change `List` to `Set` for at least one of the collections. `Set` is not considered a "bag" by Hibernate.

**Step 1:** Update entity to use `Set` instead of `List`:

```java
// Test.java
@Entity
public class Test {
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionNumber ASC")
    @Builder.Default
    private Set<Question> questions = new HashSet<>();
}

// Question.java
@Entity
public class Question {
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("optionNumber ASC")
    @Builder.Default
    private Set<Option> options = new HashSet<>();
}
```

**Step 2:** When iterating, sort explicitly if order matters:

```java
var sortedQuestions = test.getQuestions().stream()
        .sorted(Comparator.comparing(Question::getQuestionNumber))
        .toList();

var sortedOptions = question.getOptions().stream()
        .sorted(Comparator.comparing(Option::getOptionNumber))
        .toList();
```

**Note:** Using `@OrderBy` annotation helps maintain order when fetching, but explicit sorting is recommended when building DTOs.

---

## Docker Issues

### 3. App Cannot Connect to PostgreSQL

**Error Message:**

```
Connection to localhost:5432 refused
org.postgresql.util.PSQLException: Connection refused
```

**Cause:**
When running in Docker, `localhost` refers to the container itself, not the host machine or other containers. The app container cannot reach PostgreSQL using `localhost`.

**Bad Configuration:**

```yaml
# application-local.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/testcreator # Won't work in Docker!
```

**Solution:**
Use environment variables that can be overridden in Docker:

**Step 1:** Update `application-local.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:testcreator}
    username: ${DB_USERNAME:testcreator_user}
    password: ${DB_PASSWORD:testcreator_pass}
```

**Step 2:** Set environment variables in `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      DB_HOST: postgres # Docker service name, not localhost
      DB_PORT: 5432
      DB_NAME: testcreator
      DB_USERNAME: testcreator_user
      DB_PASSWORD: testcreator_pass
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    container_name: testcreator-postgres
    # ... rest of config
```

**Key Points:**

- Use Docker service names (e.g., `postgres`) instead of `localhost`
- Use `depends_on` with health checks to ensure database is ready
- Environment variables allow the same config to work locally and in Docker

---

## Frontend-Backend Integration Issues

### 4. Field Name Mismatch

**Symptom:**
Questions or options display as empty/blank even though data is being returned from the API.

**Cause:**
Frontend expects different field names than what the backend sends.

**Example:**

```javascript
// Frontend expects:
question.text;
option.text;

// Backend sends:
question.questionText;
option.optionText;
```

**Solution:**
Update frontend to handle both field names for backward compatibility:

```javascript
// In take-test.html
function showQuestion(index) {
  const question = questions[index];

  container.innerHTML = `
        <div class="question-text">
            ${escapeHtml(question.questionText || question.text || "")}
        </div>
        <div class="options-list">
            ${question.options
              .map(
                (option) => `
                <span>${escapeHtml(option.optionText || option.text || "")}</span>
            `,
              )
              .join("")}
        </div>
    `;
}
```

**Best Practice:**
Always check the actual API response structure using browser DevTools Network tab before writing frontend code.

---

### 5. Guest API Methods Missing

**Error Message:**

```
TypeError: GuestTestAPI.getAttempt is not a function
```

**Cause:**
Frontend JavaScript calls an API method that doesn't exist in `api.js`.

**Solution:**

**Step 1:** Add the missing method to `api.js`:

```javascript
const GuestTestAPI = {
  // ... existing methods
  getAttempt: (attemptId) => api.get(`/guest/attempts/${attemptId}`, {}, false),
  // ... other methods
};
```

**Step 2:** Add corresponding backend endpoint if missing:

```java
@GetMapping("/attempts/{attemptId}")
public ResponseEntity<TestAttemptDTO> getGuestAttempt(@PathVariable Long attemptId) {
    // Implementation
}
```

---

### 6. Validation Failed on Answer Submission

**Error Message:**

```
Failed to save answer: Error: Validation failed
```

**Cause:**
Frontend sends `selectedOptionId` (option's database ID like 5, 6, 7) but backend expects `selectedOption` (option number 1-4).

**Bad Request:**

```javascript
// Frontend sends:
{
    questionId: 1,
    selectedOptionId: 5  // Option's database ID
}

// Backend expects:
{
    questionId: 1,
    selectedOption: 2  // Option number (1-4)
}
```

**Solution:**
Create a guest-specific DTO that accepts option ID:

**Step 1:** Create `GuestSubmitAnswerRequest.java`:

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestSubmitAnswerRequest {
    @NotNull
    private Long questionId;

    @NotNull
    private Long selectedOptionId;  // Accept option database ID
}
```

**Step 2:** Update controller to look up option number:

```java
@PostMapping("/attempts/{attemptId}/answer")
public ResponseEntity<Void> submitGuestAnswer(
        @PathVariable Long attemptId,
        @Valid @RequestBody GuestSubmitAnswerRequest request) {

    // Get option and extract its number
    Option selectedOption = optionRepository.findById(request.getSelectedOptionId())
            .orElseThrow(() -> new ResourceNotFoundException("Option not found"));

    // Save answer with option number
    answer.setSelectedOption(selectedOption.getOptionNumber());
    studentAnswerRepository.save(answer);

    return ResponseEntity.ok().build();
}
```

---

## Security Issues

### 7. User Not Found in Guest Flow

**Error Message:**

```
Failed to submit: User not found
```

**Cause:**
Guest test submission calls a service method that tries to get the current authenticated user via `SecurityContextHolder`, but guests are not authenticated.

**Bad Code:**

```java
// In GuestTestController
@PostMapping("/attempts/{attemptId}/submit")
public ResponseEntity<TestResultDTO> submitGuestTest(@PathVariable Long attemptId) {
    // This calls a method that requires authentication!
    TestResultDTO result = testAttemptService.submitTest(attemptId);
    return ResponseEntity.ok(result);
}

// In TestAttemptService
public TestResultDTO submitTest(Long attemptId) {
    // This will fail for guests!
    String email = securityUtil.getCurrentUserEmail();
    User student = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    // ...
}
```

**Solution:**
Handle guest submission directly in the controller without using authenticated service methods:

```java
@PostMapping("/attempts/{attemptId}/submit")
@Transactional
public ResponseEntity<TestResultDTO> submitGuestTest(@PathVariable Long attemptId) {
    TestAttempt attempt = testAttemptRepository.findByIdWithAnswers(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

    // Verify this is a guest attempt
    if (attempt.getStudent() != null) {
        throw new BusinessException("This attempt is not a guest attempt");
    }

    // Update status
    attempt.setStatus(AttemptStatus.SUBMITTED);
    attempt.setSubmittedAt(LocalDateTime.now());

    // Calculate result directly (doesn't need auth)
    TestResultDTO result = resultService.calculateResult(attempt);

    // Save result
    attempt.setScore(result.getScore().intValue());
    attempt.setResult(ResultStatus.valueOf(result.getResult()));
    testAttemptRepository.save(attempt);

    return ResponseEntity.ok(result);
}
```

---

### 8. 403 Forbidden for Static Resources

**Error Message:**

```
GET http://localhost:8080/favicon.ico 403 (Forbidden)
```

**Cause:**
Static resource not found, but Spring Security returns 403 instead of 404 in some configurations.

**Solution Options:**

**Option 1:** Ensure the file exists:

```bash
# Check if favicon.ico exists
ls -la src/main/resources/static/favicon.ico
```

**Option 2:** Add proper security configuration:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            // Static resources - be explicit
            .requestMatchers("/", "/index.html", "/favicon.ico").permitAll()
            .requestMatchers("/css/**", "/js/**", "/images/**", "/pages/**").permitAll()
            // ... other rules
        );
    return http.build();
}
```

**Option 3:** Reference the correct favicon in HTML:

```html
<head>
  <link rel="icon" type="image/svg+xml" href="/edtech-favicon.svg" />
  <!-- or -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
</head>
```

---

## General Debugging Tips

1. **Check Docker logs:**

   ```bash
   docker-compose logs -f app
   ```

2. **Check browser DevTools:**
   - Network tab for API requests/responses
   - Console tab for JavaScript errors

3. **Enable SQL logging:**

   ```yaml
   spring:
     jpa:
       show-sql: true
       properties:
         hibernate:
           format_sql: true
   logging:
     level:
       org.hibernate.SQL: DEBUG
       org.hibernate.type.descriptor.sql.BasicBinder: TRACE
   ```

4. **Test endpoints with curl:**
   ```bash
   curl -X GET http://localhost:8080/api/guest/tests/guest_xxx
   curl -X POST http://localhost:8080/api/guest/attempts/1/answer \
        -H "Content-Type: application/json" \
        -d '{"questionId": 1, "selectedOptionId": 5}'
   ```

---

## Related Documentation

- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md)
- [API Reference](API_REFERENCE.md)
- [Project Setup](PROJECT_SETUP.md)
