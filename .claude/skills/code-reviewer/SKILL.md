---
name: code-reviewer
description: >
  Reviews Java/Spring Boot code for quality, correctness, and adherence to project coding
  standards. Use this skill when the user asks for a code review, wants feedback on a class
  or method, or asks whether their code follows best practices. Covers naming conventions,
  Spring Boot patterns (DI, transactions, REST), security standards, testing (AAA pattern),
  database/JPA design, performance (N+1, caching), and code quality metrics (complexity,
  method length, parameter count). Reports findings with severity: BLOCKER, CRITICAL, HIGH,
  MEDIUM, LOW, INFO.
---

# Detailed Coding Guidelines for Code Reviewer Agent

This document provides the comprehensive coding standards that the Code Reviewer Agent uses to evaluate code quality.

## Java Coding Standards

### Naming Conventions
- **Classes**: PascalCase, noun phrases (e.g., `UserService`, `SubscriptionRepository`)
- **Interfaces**: PascalCase, adjective/noun (e.g., `Payable`, `UserRepository`)
- **Methods**: camelCase, verb phrases (e.g., `getUserById`, `processPayment`)
- **Variables**: camelCase, descriptive nouns (e.g., `userName`, `totalAmount`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- **Packages**: lowercase, singular (e.g., `com.example.service`, not `com.example.services`)

### Class Structure Order
1. Static fields
2. Instance fields
3. Constructors
4. Static methods
5. Instance methods
6. Getters/Setters (if not using Lombok)
7. Inner classes

### Method Guidelines
- **Size**: Maximum 20-30 lines (excluding simple getters/setters)
- **Parameters**: Maximum 3-4 parameters (use objects for more)
- **Cognitive Complexity**: Keep under 10
- **Nesting**: Maximum 3 levels deep
- **Return Early**: Use guard clauses to reduce nesting

### Comments
- **When to comment**: Why, not what
- **When NOT to comment**: Obvious code
- **JavaDoc**: Required for public APIs
- **TODO comments**: Include ticket number and deadline

## Spring Boot Specific Standards

### Dependency Injection
```java
// Good: Constructor injection (immutable, testable)
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
}

// Bad: Field injection (harder to test)
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

### Transaction Management
```java
// Good: Explicit transaction boundaries
@Service
@Transactional
public class OrderService {

    @Transactional(readOnly = true)
    public Order getOrder(Long id) {
        // Read-only operations
    }

    public Order createOrder(OrderRequest request) {
        // Write operations (uses class-level @Transactional)
    }
}
```

### Exception Handling
```java
// Good: Specific exceptions with context
public User getUserById(Long id) {
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(
            "User not found with id: " + id));
}

// Bad: Generic exceptions
public User getUserById(Long id) {
    try {
        return userRepository.findById(id).get();
    } catch (Exception e) {
        throw new RuntimeException("Error");
    }
}
```

### REST Controller Patterns
```java
// Good: Proper HTTP methods and status codes
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(
            @PathVariable @Positive Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserDTO user = userService.createUser(request);
        URI location = URI.create("/api/v1/users/" + user.getId());
        return ResponseEntity.created(location).body(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable @Positive Long id) {
        userService.deleteUser(id);
    }
}
```

## Security Standards

### Input Validation
- **Always validate** at controller level
- Use Bean Validation annotations
- Validate business rules in service layer
- Sanitize output to prevent XSS

### Password Handling
```java
// Good: Never log or expose passwords
public void createUser(String email, String password) {
    log.info("Creating user with email: {}", email);
    String encodedPassword = passwordEncoder.encode(password);
    // ...
}

// Bad: Password in logs
public void createUser(String email, String password) {
    log.info("Creating user: {} with password: {}", email, password);
}
```

### SQL Injection Prevention
```java
// Good: Parameterized queries
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmail(@Param("email") String email);

// Bad: String concatenation
@Query("SELECT u FROM User u WHERE u.email = '" + email + "'")
Optional<User> findByEmail(String email);
```

## Testing Standards

### Unit Test Structure (AAA Pattern)
```java
@Test
void createUser_WithValidData_ReturnsCreatedUser() {
    // Arrange
    CreateUserRequest request = CreateUserRequest.builder()
        .email("test@example.com")
        .password("password123")
        .build();

    User user = new User();
    user.setId(1L);
    when(userRepository.save(any())).thenReturn(user);

    // Act
    UserDTO result = userService.createUser(request);

    // Assert
    assertNotNull(result);
    assertEquals(1L, result.getId());
    verify(userRepository).save(any(User.class));
}
```

### Test Coverage Requirements
- **Minimum**: 80% line coverage
- **Focus**: Business logic and edge cases
- **Don't test**: Simple getters/setters, constructors
- **Do test**: Error handling, validation, business rules

## Database Standards

### Entity Design
```java
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_email", columnList = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    @Column(nullable = false)
    private Boolean active = true;
}
```

### Flyway Migration Best Practices
- Use versioned migrations: `V1__description.sql`
- Never modify existing migrations
- Include rollback scripts
- Test migrations on sample data
- Use descriptive names

## Performance Standards

### N+1 Query Prevention
```java
// Good: Fetch with JOIN
@Query("SELECT u FROM User u LEFT JOIN FETCH u.orders WHERE u.id = :id")
Optional<User> findByIdWithOrders(@Param("id") Long id);

// Bad: Lazy loading causes N+1
public List<UserDTO> getAllUsers() {
    return userRepository.findAll().stream()
        .map(user -> {
            // This causes N+1!
            int orderCount = user.getOrders().size();
            return new UserDTO(user, orderCount);
        })
        .collect(Collectors.toList());
}
```

### Caching Strategy
```java
@Cacheable(value = "users", key = "#id")
public UserDTO getUserById(Long id) {
    // Cached for frequently accessed data
}

@CacheEvict(value = "users", key = "#id")
public void deleteUser(Long id) {
    // Evict cache on delete
}
```

## Code Quality Metrics

### Acceptable Ranges
- **Cyclomatic Complexity**: < 10 per method
- **Cognitive Complexity**: < 15 per method
- **Class Length**: < 300 lines
- **Method Length**: < 30 lines
- **Parameter Count**: < 4 parameters
- **Return Statements**: < 3 per method

## Common Anti-Patterns to Avoid

1. **God Class**: Classes doing too much
2. **Anemic Domain Model**: Entities with no behavior
3. **Magic Numbers**: Unexplained constants
4. **Shotgun Surgery**: Changes requiring updates in many places
5. **Primitive Obsession**: Using primitives instead of domain objects
6. **Feature Envy**: Method using more of another class than its own

## Review Severity Levels

- **BLOCKER**: Prevents build/deployment, must fix immediately
- **CRITICAL**: Security vulnerability or data loss risk
- **HIGH**: Violates best practices, should fix soon
- **MEDIUM**: Code quality issue, consider fixing
- **LOW**: Minor improvement, nice to have
- **INFO**: Suggestion or tip
