# Coding Guidelines - Online Test Creator

## General Principles

### 1. Code Organization
- One class per file
- Package by feature AND layer (hybrid approach)
- Keep related code together within packages
- Minimize cross-package dependencies
- Clear separation: `controller`, `service`, `repository`, `dto`, `entity`

### 2. Naming Conventions
- **Classes**: PascalCase (e.g., `TestService`, `TestController`, `TestAttempt`)
- **Methods**: camelCase (e.g., `getTestById`, `createTest`, `submitAnswer`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TAB_SWITCHES`, `DEFAULT_CACHE_TTL`)
- **Variables**: camelCase (e.g., `testId`, `studentEmail`, `attemptId`)
- **Packages**: lowercase (e.g., `com.testcreator.service`, `com.testcreator.dto`)

### 3. Method Design
- Keep methods small (< 30 lines preferred, < 50 maximum)
- One responsibility per method (Single Responsibility Principle)
- Use descriptive names that indicate what the method does
- Avoid side effects (methods should do what they say)
- Return early to reduce nesting
- Use Optional<T> for nullable returns

### 4. Error Handling

```java
// Good - Proper exception handling
public TestDTO findTestById(Long id) {
    return testRepository.findById(id)
        .map(testMapper::toDTO)
        .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + id));
}

// Bad - Using .get() without checking
public TestDTO findTestById(Long id) {
    return testMapper.toDTO(testRepository.findById(id).get());  // May throw NoSuchElementException
}

// Good - Custom exception with context
@Transactional
public void deleteTest(Long testId, String teacherEmail) {
    Test test = testRepository.findById(testId)
        .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
        throw new ForbiddenException("You can only delete your own tests");
    }

    if (testAttemptRepository.existsByTestId(testId)) {
        throw new BusinessException("Cannot delete test with existing attempts");
    }

    testRepository.delete(test);
}
```

## Spring Boot Specific

### 1. Controller Guidelines

```java
// Good - Comprehensive controller implementation
@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@Tag(name = "Test Management", description = "APIs for teachers to manage tests")
@Validated
public class TestController {

    private final TestService testService;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Create a new test", description = "Creates a new test in DRAFT status")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Test created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<TestDTO> createTest(
            @Valid @RequestBody CreateTestRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Creating test: {} by teacher: {}", request.getTitle(), userDetails.getUsername());
        TestDTO test = testService.createTest(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(test);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get test by ID")
    public ResponseEntity<TestDTO> getTest(
            @PathVariable @Positive(message = "Test ID must be positive") Long id) {

        TestDTO test = testService.getTest(id);
        return ResponseEntity.ok(test);
    }

    @GetMapping
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get all tests with pagination and filtering")
    public ResponseEntity<Page<TestSummaryDTO>> getAllTests(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
            @RequestParam(required = false) TestStatus status,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @AuthenticationPrincipal UserDetails userDetails) {

        PageRequest pageRequest = PageRequest.of(page, size, direction, sort);
        Page<TestSummaryDTO> tests = testService.getAllTests(
            userDetails.getUsername(), status, pageRequest);
        return ResponseEntity.ok(tests);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Delete a test")
    public ResponseEntity<Void> deleteTest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        testService.deleteTest(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}

// Bad - Missing annotations, validation, and security
@RestController
@RequestMapping("/tests")
public class TestController {

    @Autowired  // Use constructor injection, not field injection
    private TestService testService;

    @PostMapping
    public Test createTest(@RequestBody CreateTestRequest request) {  // Returns entity!
        return testService.createTest(request);
    }

    @GetMapping
    public List<Test> getAll() {  // No pagination! No filtering!
        return testService.findAll();
    }
}
```

### 2. Service Layer

```java
// Good - Transactional service with proper separation
@Service
@RequiredArgsConstructor
@Slf4j
public class TestService {

    private final TestRepository testRepository;
    private final UserRepository userRepository;
    private final TestMapper testMapper;
    private final TestAttemptRepository testAttemptRepository;

    @Transactional  // Write operation - routes to primary DB
    public TestDTO createTest(CreateTestRequest request, String teacherEmail) {
        log.info("Creating test: {} by teacher: {}", request.getTitle(), teacherEmail);

        // Validation
        validateTestRequest(request);

        // Fetch related entities
        User teacher = userRepository.findByEmail(teacherEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        // Business logic
        Test test = testMapper.toEntity(request);
        test.setCreatedBy(teacher);
        test.setStatus(TestStatus.DRAFT);

        // Persistence
        test = testRepository.save(test);

        log.info("Test created successfully with ID: {}", test.getId());
        return testMapper.toDTO(test);
    }

    @ReadOnly  // Read operation - routes to read replica
    @Cacheable(value = "tests", key = "#testId")  // Cache for 2 hours
    public TestDTO getTest(Long testId) {
        log.debug("Fetching test with ID: {}", testId);

        return testRepository.findByIdWithQuestionsAndOptions(testId)
            .map(testMapper::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));
    }

    @Transactional
    @CacheEvict(value = "tests", key = "#testId")  // Invalidate cache
    public TestDTO updateTest(Long testId, UpdateTestRequest request, String teacherEmail) {
        Test test = testRepository.findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

        // Authorization check
        if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
            throw new ForbiddenException("You can only update your own tests");
        }

        // Business rule: Can only update DRAFT tests
        if (test.getStatus() != TestStatus.DRAFT) {
            throw new BusinessException("Cannot update published tests");
        }

        testMapper.updateEntity(test, request);
        test = testRepository.save(test);

        return testMapper.toDTO(test);
    }

    private void validateTestRequest(CreateTestRequest request) {
        if (request.getQuestions().size() != request.getTotalQuestions()) {
            throw new ValidationException(
                String.format("Expected %d questions but got %d",
                    request.getTotalQuestions(),
                    request.getQuestions().size()));
        }

        // Validate each question has 4 options
        for (var question : request.getQuestions()) {
            if (question.getOptions().size() != 4) {
                throw new ValidationException(
                    "Question " + question.getQuestionNumber() + " must have exactly 4 options");
            }
        }
    }
}

// Bad - No transaction management, poor error handling
@Service
public class TestService {

    @Autowired
    private TestRepository testRepository;

    public Test createTest(CreateTestRequest request) {
        Test test = new Test();
        test.setTitle(request.getTitle());
        return testRepository.save(test);  // No validation, no error handling
    }

    public Test getTest(Long id) {
        return testRepository.findById(id).get();  // May throw exception
    }
}
```

### 3. Entity Design

```java
// Good - Properly annotated entity with indexes and audit
@Entity
@Table(name = "tests",
       indexes = {
           @Index(name = "idx_tests_created_by", columnList = "created_by_id"),
           @Index(name = "idx_tests_status", columnList = "status"),
           @Index(name = "idx_tests_date", columnList = "test_date"),
           @Index(name = "idx_tests_created_by_status", columnList = "created_by_id,status")
       })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Test {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)  // Always LAZY for ManyToOne
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private Integer totalQuestions;

    @Column(nullable = false)
    private Integer passingScore;

    @Column(nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private LocalDateTime testDate;

    @Enumerated(EnumType.STRING)  // Use STRING, not ORDINAL
    @Column(nullable = false, length = 50)
    private TestStatus status = TestStatus.DRAFT;

    // Cascade ALL - deleting test deletes questions
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionNumber ASC")
    private List<Question> questions = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Helper methods
    public void addQuestion(Question question) {
        questions.add(question);
        question.setTest(this);
    }

    public void removeQuestion(Question question) {
        questions.remove(question);
        question.setTest(null);
    }
}

// Bad - Poor entity design
@Entity
@Data  // Don't use @Data on entities - causes issues with equals/hashCode
public class Test {
    @Id
    @GeneratedValue  // Specify strategy!
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)  // Bad - causes N+1 queries
    private User createdBy;

    @OneToMany(mappedBy = "test")  // No cascade - orphaned records!
    private List<Question> questions;

    @Enumerated  // Defaults to ORDINAL - breaks on reordering!
    private TestStatus status;

    private Date createdAt;  // Use LocalDateTime, not Date

    // Missing indexes, audit fields, and proper column definitions
}
```

### 4. DTO Usage

```java
// Good - Request DTO with validation
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTestRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 500, message = "Title must be between 5 and 500 characters")
    private String title;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Total questions is required")
    @Min(value = 1, message = "Must have at least 1 question")
    @Max(value = 100, message = "Cannot have more than 100 questions")
    private Integer totalQuestions;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score cannot be negative")
    @Max(value = 100, message = "Passing score cannot exceed 100")
    private Integer passingScore;

    @NotNull(message = "Duration is required")
    @Min(value = 5, message = "Minimum duration is 5 minutes")
    @Max(value = 240, message = "Maximum duration is 240 minutes")
    private Integer durationMinutes;

    @NotNull(message = "Test date is required")
    @Future(message = "Test date must be in the future")
    private LocalDateTime testDate;

    @Valid
    @NotEmpty(message = "Questions list cannot be empty")
    private List<CreateQuestionRequest> questions;
}

// Good - Response DTO (never expose password or sensitive fields)
@Data
@Builder
public class TestDTO {
    private Long id;
    private String title;
    private String description;
    private UserSummaryDTO createdBy;  // Nested DTO, not entity
    private Integer totalQuestions;
    private Integer passingScore;
    private Integer durationMinutes;
    private LocalDateTime testDate;
    private TestStatus status;
    private List<QuestionDTO> questions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

// Good - Summary DTO for list views (lighter weight)
@Data
@AllArgsConstructor
public class TestSummaryDTO {
    private Long id;
    private String title;
    private LocalDateTime testDate;
    private TestStatus status;
    private Integer questionCount;
    private LocalDateTime createdAt;
    // No questions list - keeps response size small
}

// Bad - No validation, exposes entity
@Data
public class CreateTestRequest {
    private String title;  // No validation!
    private List<Question> questions;  // Should be DTO, not entity!
}
```

## Repository Optimization

### 1. Efficient Queries

```java
// Good - Optimized repository with JOIN FETCH
@Repository
public interface TestRepository extends JpaRepository<Test, Long> {

    // Avoid N+1 queries with JOIN FETCH
    @Query("SELECT t FROM Test t " +
           "LEFT JOIN FETCH t.questions q " +
           "LEFT JOIN FETCH q.options " +
           "LEFT JOIN FETCH t.createdBy " +
           "WHERE t.id = :testId")
    Optional<Test> findByIdWithQuestionsAndOptions(@Param("testId") Long testId);

    // Use DTO projection for list views
    @Query("SELECT new com.testcreator.dto.TestSummaryDTO(" +
           "t.id, t.title, t.testDate, t.status, " +
           "COUNT(q.id), t.createdAt) " +
           "FROM Test t " +
           "LEFT JOIN t.questions q " +
           "WHERE t.createdBy.email = :email " +
           "AND (:status IS NULL OR t.status = :status) " +
           "GROUP BY t.id " +
           "ORDER BY t.createdAt DESC")
    Page<TestSummaryDTO> findTestSummariesByTeacher(
        @Param("email") String teacherEmail,
        @Param("status") TestStatus status,
        Pageable pageable);

    // Method naming conventions
    Optional<Test> findByIdAndCreatedByEmail(Long id, String email);

    boolean existsByTitleAndCreatedByEmail(String title, String email);

    List<Test> findByStatusAndTestDateBetween(
        TestStatus status,
        LocalDateTime startDate,
        LocalDateTime endDate);

    // Native query for complex operations
    @Modifying
    @Query(value = "UPDATE tests SET status = 'ARCHIVED' " +
                   "WHERE test_date < CURRENT_DATE - INTERVAL '90 days' " +
                   "AND status = 'PUBLISHED'",
           nativeQuery = true)
    int archiveOldTests();

    // Count with filter
    @Query("SELECT COUNT(t) FROM Test t WHERE t.createdBy.id = :teacherId AND t.status = :status")
    long countByTeacherAndStatus(@Param("teacherId") Long teacherId, @Param("status") TestStatus status);
}

// Bad - Inefficient queries causing N+1 problems
@Repository
public interface TestRepository extends JpaRepository<Test, Long> {

    // This causes N+1 queries when accessing questions
    Optional<Test> findById(Long id);

    // No pagination - loads everything into memory
    List<Test> findAll();

    // Inefficient - no pagination or filtering
    List<Test> findByCreatedById(Long teacherId);
}
```

## Security Guidelines

### 1. Input Validation

```java
// Good - Comprehensive validation
@PostMapping("/student/attempts/{attemptId}/answer")
@PreAuthorize("hasRole('STUDENT')")
public ResponseEntity<AnswerResponseDTO> submitAnswer(
        @PathVariable @Positive Long attemptId,
        @Valid @RequestBody SubmitAnswerRequest request,
        @AuthenticationPrincipal UserDetails userDetails) {

    // Additional business validation
    if (request.getSelectedOption() < 1 || request.getSelectedOption() > 4) {
        throw new ValidationException("Selected option must be between 1 and 4");
    }

    AnswerResponseDTO response = studentService.submitAnswer(
        attemptId, request, userDetails.getUsername());
    return ResponseEntity.ok(response);
}

// Good - DTO-level validation
@Data
public class SubmitAnswerRequest {

    @NotNull(message = "Question ID is required")
    @Positive(message = "Question ID must be positive")
    private Long questionId;

    @NotNull(message = "Selected option is required")
    @Min(value = 1, message = "Option must be 1-4")
    @Max(value = 4, message = "Option must be 1-4")
    private Integer selectedOption;
}
```

### 2. Password Handling

```java
// Good - Secure password handling
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void registerUser(RegisterRequest request) {
        // Validate password strength
        if (!isPasswordStrong(request.getPassword())) {
            throw new ValidationException(
                "Password must be at least 8 characters with uppercase, lowercase, number, and special character");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already registered");
        }

        User user = User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))  // Always encode
            .name(request.getName())
            .role(request.getRole())
            .active(true)
            .build();

        userRepository.save(user);

        // Never log passwords!
        log.info("User registered: {}", user.getEmail());
    }

    private boolean isPasswordStrong(String password) {
        return password.length() >= 8
            && password.matches(".*[A-Z].*")  // Uppercase
            && password.matches(".*[a-z].*")  // Lowercase
            && password.matches(".*\\d.*")    // Digit
            && password.matches(".*[@#$%^&+=].*");  // Special char
    }
}

// Bad - Insecure password handling
@Service
public class AuthService {
    public void registerUser(RegisterRequest request) {
        User user = new User();
        user.setPassword(request.getPassword());  // Plain text!
        userRepository.save(user);
        log.info("Password: {}", user.getPassword());  // NEVER LOG PASSWORDS!
    }
}
```

### 3. Authorization

```java
// Good - Proper authorization checks
@Service
public class TestService {

    @Transactional
    @PreAuthorize("hasRole('TEACHER')")
    public void deleteTest(Long testId, String teacherEmail) {
        Test test = testRepository.findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

        // Verify ownership
        if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
            throw new ForbiddenException("You can only delete your own tests");
        }

        // Business rule
        if (testAttemptRepository.existsByTestId(testId)) {
            throw new BusinessException("Cannot delete test with existing attempts");
        }

        testRepository.delete(test);
    }
}

// Bad - No authorization check
@Service
public class TestService {
    public void deleteTest(Long testId) {
        testRepository.deleteById(testId);  // Anyone can delete any test!
    }
}
```

## Database Guidelines

### 1. Flyway Migrations

```sql
-- Good: V1__create_users_table.sql
-- Rollback: DROP TABLE users CASCADE;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active) WHERE active = true;

COMMENT ON TABLE users IS 'Application users (teachers and students)';
COMMENT ON COLUMN users.role IS 'User role: TEACHER or STUDENT';

-- Good: V2__create_tests_table.sql
-- Rollback: DROP TABLE tests CASCADE;

CREATE TABLE tests (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by_id BIGINT NOT NULL,
    total_questions INTEGER NOT NULL CHECK (total_questions > 0 AND total_questions <= 100),
    passing_score INTEGER NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 240),
    test_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_tests_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tests_created_by ON tests(created_by_id);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_date ON tests(test_date);
CREATE INDEX idx_tests_created_by_status ON tests(created_by_id, status);

-- Partial index for active tests only
CREATE INDEX idx_active_tests ON tests(status) WHERE status = 'PUBLISHED';
```

## Testing Guidelines

### 1. Unit Tests

```java
// Good - Comprehensive unit test
@ExtendWith(MockitoExtension.class)
@DisplayName("TestService Unit Tests")
class TestServiceTest {

    @Mock
    private TestRepository testRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TestMapper testMapper;

    @Mock
    private TestAttemptRepository testAttemptRepository;

    @InjectMocks
    private TestService testService;

    @Nested
    @DisplayName("createTest")
    class CreateTestTests {

        @Test
        @DisplayName("Should create test successfully with valid data")
        void shouldCreateTestSuccessfully() {
            // Given
            CreateTestRequest request = CreateTestRequest.builder()
                .title("Java Quiz")
                .totalQuestions(10)
                .questions(createValidQuestions(10))
                .build();

            User teacher = User.builder()
                .id(1L)
                .email("teacher@test.com")
                .build();

            Test test = Test.builder()
                .id(1L)
                .title("Java Quiz")
                .build();

            TestDTO expectedDTO = TestDTO.builder()
                .id(1L)
                .title("Java Quiz")
                .status(TestStatus.DRAFT)
                .build();

            when(userRepository.findByEmail("teacher@test.com"))
                .thenReturn(Optional.of(teacher));
            when(testMapper.toEntity(request)).thenReturn(test);
            when(testRepository.save(any(Test.class))).thenReturn(test);
            when(testMapper.toDTO(test)).thenReturn(expectedDTO);

            // When
            TestDTO result = testService.createTest(request, "teacher@test.com");

            // Then
            assertNotNull(result);
            assertEquals("Java Quiz", result.getTitle());
            assertEquals(TestStatus.DRAFT, result.getStatus());

            verify(userRepository).findByEmail("teacher@test.com");
            verify(testRepository).save(any(Test.class));
            verify(testMapper).toDTO(test);
            verifyNoMoreInteractions(testRepository);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when teacher not found")
        void shouldThrowExceptionWhenTeacherNotFound() {
            // Given
            CreateTestRequest request = CreateTestRequest.builder()
                .title("Java Quiz")
                .build();

            when(userRepository.findByEmail("teacher@test.com"))
                .thenReturn(Optional.empty());

            // When & Then
            assertThrows(ResourceNotFoundException.class,
                () -> testService.createTest(request, "teacher@test.com"));

            verify(userRepository).findByEmail("teacher@test.com");
            verifyNoInteractions(testRepository);
        }

        @Test
        @DisplayName("Should throw ValidationException when question count mismatch")
        void shouldThrowExceptionOnQuestionCountMismatch() {
            // Given
            CreateTestRequest request = CreateTestRequest.builder()
                .title("Java Quiz")
                .totalQuestions(10)
                .questions(createValidQuestions(5))  // Mismatch!
                .build();

            // When & Then
            ValidationException exception = assertThrows(ValidationException.class,
                () -> testService.createTest(request, "teacher@test.com"));

            assertTrue(exception.getMessage().contains("Expected 10 questions but got 5"));
        }
    }

    private List<CreateQuestionRequest> createValidQuestions(int count) {
        return IntStream.range(1, count + 1)
            .mapToObj(i -> CreateQuestionRequest.builder()
                .questionNumber(i)
                .questionText("Question " + i)
                .options(List.of(/* 4 options */))
                .correctOptionNumber(1)
                .build())
            .collect(Collectors.toList());
    }
}
```

### 2. Integration Tests

```java
// Good - Integration test with Testcontainers
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("TestController Integration Tests")
class TestControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private UserRepository userRepository;

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @BeforeEach
    void setup() {
        testRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "teacher@test.com", roles = "TEACHER")
    @DisplayName("Should create test successfully")
    void shouldCreateTest() throws Exception {
        String requestBody = """
            {
                "title": "Java Fundamentals",
                "description": "Basic Java concepts",
                "totalQuestions": 10,
                "passingScore": 70,
                "durationMinutes": 30,
                "testDate": "2026-03-01T10:00:00",
                "questions": []
            }
            """;

        mockMvc.perform(post("/api/tests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Java Fundamentals"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.totalQuestions").value(10))
                .andExpect(jsonPath("$.passingScore").value(70));

        // Verify in database
        assertEquals(1, testRepository.count());
        Test savedTest = testRepository.findAll().get(0);
        assertEquals("Java Fundamentals", savedTest.getTitle());
        assertEquals(TestStatus.DRAFT, savedTest.getStatus());
    }
}
```

## Performance Guidelines

### 1. Caching

```java
// Good - Strategic caching
@Service
public class TestService {

    @Cacheable(value = "tests", key = "#testId", unless = "#result == null")
    @ReadOnly
    public TestDTO getTest(Long testId) {
        // Cached for 2 hours (configured in Redis)
        return testRepository.findByIdWithQuestionsAndOptions(testId)
            .map(testMapper::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));
    }

    @CacheEvict(value = "tests", key = "#testId")
    @Transactional
    public TestDTO updateTest(Long testId, UpdateTestRequest request) {
        // Cache invalidated on update
        // ...
    }

    @CacheEvict(value = "tests", allEntries = true)
    @Scheduled(fixedRate = 7200000)  // Every 2 hours
    public void evictAllTestsCache() {
        log.info("Evicting all tests cache");
    }
}

// Bad - Caching mutable data
@Service
public class TestService {

    @Cacheable("test-attempts")  // DON'T cache active attempts!
    public TestAttemptDTO getActiveAttempt(Long attemptId) {
        // This data changes frequently - shouldn't be cached
    }
}
```

### 2. Batch Operations

```java
// Good - Batch processing
@Transactional
public void createQuestionsInBatch(Long testId, List<CreateQuestionRequest> requests) {
    Test test = testRepository.findById(testId)
        .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    List<Question> questions = requests.stream()
        .map(req -> questionMapper.toEntity(req, test))
        .collect(Collectors.toList());

    // Save all at once
    questionRepository.saveAll(questions);
    questionRepository.flush();
}

// Bad - Saving one by one
public void createQuestions(Long testId, List<CreateQuestionRequest> requests) {
    for (CreateQuestionRequest req : requests) {
        Question question = questionMapper.toEntity(req);
        questionRepository.save(question);  // N database calls!
    }
}
```

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows Google Java Style Guide
- [ ] Methods are small and focused (<30 lines)
- [ ] Proper error handling with custom exceptions
- [ ] Input validation on all endpoints
- [ ] Security considerations (authentication, authorization)
- [ ] Tests written and passing (80% coverage)
- [ ] No hardcoded values (use application.yml)
- [ ] DTOs used instead of entities in APIs
- [ ] Caching strategy appropriate (not caching mutable data)
- [ ] Database queries optimized (JOIN FETCH, DTO projections)
- [ ] Proper use of @Transactional and @ReadOnly
- [ ] Logging at appropriate levels
- [ ] Documentation updated (JavaDoc for public APIs)
- [ ] No commented-out code
- [ ] No System.out.println (use logger)
- [ ] Proper exception handling (no empty catch blocks)
- [ ] Thread-safe if dealing with shared state
- [ ] Performance impact considered for high QPS

---

**Last Updated**: February 11, 2026
**Applies to**: Online Test Creator Project
