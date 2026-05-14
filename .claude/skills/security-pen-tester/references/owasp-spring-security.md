# OWASP Spring Security Guidelines

This reference is loaded by the `security-pen-tester` skill when performing security analysis
on Spring Boot applications. Guidelines are drawn from OWASP's Spring Security documentation.

**Source:** https://owasp.org/dev-pages/java/spring/index.html

---

## Table of Contents

1. [Security Headers Configuration](#security-headers-configuration)
2. [Authentication Best Practices](#authentication-best-practices)
3. [Authorization Patterns](#authorization-patterns)
4. [XSS Prevention](#xss-prevention)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [Dependency Management](#dependency-management)
7. [Sensitive Data Protection](#sensitive-data-protection)
8. [Input Validation](#input-validation)
9. [CSRF Protection](#csrf-protection)
10. [Session Management](#session-management)

---

## Security Headers Configuration

Spring Security provides significant security capabilities that developers can leverage to improve application security. As of Spring 4, using SecurityContext with default settings provides sound protection for web applications.

### Default Security Headers

Spring Security automatically adds these headers when properly configured:
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)

### Complete Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Enable all default security headers
            .headers(headers -> headers
                // Content Security Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data:; " +
                        "font-src 'self'; " +
                        "frame-ancestors 'none'; " +
                        "form-action 'self'"
                    ))
                // HTTP Strict Transport Security
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                    .preload(true))
                // X-Frame-Options
                .frameOptions(frame -> frame.deny())
                // X-Content-Type-Options
                .contentTypeOptions(Customizer.withDefaults())
                // XSS Protection
                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                // Referrer Policy
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                // Permissions Policy
                .permissionsPolicy(permissions -> permissions
                    .policy("geolocation=(), camera=(), microphone=()"))
            )
            // CORS configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Session management
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("https://trusted-domain.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("X-Total-Count"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

---

## Authentication Best Practices

Spring Security integrates with various identity providers. A critical pitfall to avoid is accidentally leaving resources unprotected—having rules that allow access be too permissive.

### Password Encoding

```java
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with cost factor 12 (recommended minimum: 10)
        return new BCryptPasswordEncoder(12);
    }
}

// For password migration scenarios, use DelegatingPasswordEncoder
@Bean
public PasswordEncoder passwordEncoder() {
    String idForEncode = "bcrypt";
    Map<String, PasswordEncoder> encoders = new HashMap<>();
    encoders.put("bcrypt", new BCryptPasswordEncoder(12));
    encoders.put("argon2", Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
    encoders.put("scrypt", SCryptPasswordEncoder.defaultsForSpringSecurity_v5_8());

    return new DelegatingPasswordEncoder(idForEncode, encoders);
}
```

### JWT Configuration

```java
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long validityInMilliseconds;

    @PostConstruct
    protected void init() {
        // Ensure secret is strong enough
        if (secretKey.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 256 bits");
        }
    }

    public String createToken(UserDetails userDetails) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);

        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .claim("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()))
            .setIssuedAt(now)
            .setExpiration(validity)
            .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()), SignatureAlgorithm.HS256)
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes()))
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

### Account Lockout Protection

```java
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION = 15 * 60 * 1000; // 15 minutes

    private final LoadingCache<String, Integer> attemptsCache;

    public LoginAttemptService() {
        attemptsCache = CacheBuilder.newBuilder()
            .expireAfterWrite(LOCK_TIME_DURATION, TimeUnit.MILLISECONDS)
            .build(new CacheLoader<>() {
                @Override
                public Integer load(String key) {
                    return 0;
                }
            });
    }

    public void loginFailed(String key) {
        int attempts = attemptsCache.getUnchecked(key);
        attemptsCache.put(key, ++attempts);
    }

    public void loginSucceeded(String key) {
        attemptsCache.invalidate(key);
    }

    public boolean isBlocked(String key) {
        return attemptsCache.getUnchecked(key) >= MAX_ATTEMPTS;
    }
}
```

---

## Authorization Patterns

Two authorization patterns are essential:

1. **Function-level access control** via annotations on controllers/services
2. **Instance-based authorization** through ORM lifecycle events (ensuring users access only their own data)

### Method-Level Security

```java
@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestController {

    private final TestService testService;

    // Role-based access
    @GetMapping
    @PreAuthorize("hasRole('TEACHER')")
    public Page<TestDTO> getAllTests(Pageable pageable) {
        return testService.findAll(pageable);
    }

    // Permission-based access
    @PostMapping
    @PreAuthorize("hasAuthority('TEST_CREATE')")
    public TestDTO createTest(@Valid @RequestBody CreateTestRequest request) {
        return testService.create(request);
    }

    // Dynamic authorization with SpEL
    @PutMapping("/{id}")
    @PreAuthorize("@testService.isOwner(#id, authentication.name)")
    public TestDTO updateTest(@PathVariable Long id,
                               @Valid @RequestBody UpdateTestRequest request) {
        return testService.update(id, request);
    }

    // Post-authorization filtering
    @GetMapping("/my-tests")
    @PostFilter("filterObject.createdBy == authentication.name")
    public List<TestDTO> getMyTests() {
        return testService.findAll();
    }
}
```

### Instance-Based Authorization Service

```java
@Service
@RequiredArgsConstructor
public class TestService {

    private final TestRepository testRepository;
    private final TestMapper testMapper;

    public boolean isOwner(Long testId, String username) {
        return testRepository.findById(testId)
            .map(test -> test.getCreatedBy().getEmail().equals(username))
            .orElse(false);
    }

    @Transactional
    public TestDTO update(Long id, UpdateTestRequest request) {
        Test test = testRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

        // Additional business-level authorization
        String currentUser = SecurityContextHolder.getContext()
            .getAuthentication().getName();

        if (!test.getCreatedBy().getEmail().equals(currentUser)) {
            throw new AccessDeniedException("You can only update your own tests");
        }

        testMapper.updateEntity(test, request);
        return testMapper.toDTO(testRepository.save(test));
    }
}
```

---

## XSS Prevention

Unless the application is using Thymeleaf, Java/JSP applications can be susceptible to XSS. Encode all output using library-level functions to prevent user input execution.

### Thymeleaf (Automatic Escaping)

```html
<!-- SAFE - automatic escaping -->
<p th:text="${userInput}"></p>

<!-- DANGEROUS - raw output (avoid unless absolutely necessary) -->
<p th:utext="${trustedHtml}"></p>

<!-- Safe attribute binding -->
<a th:href="@{/user/{id}(id=${userId})}">Profile</a>

<!-- Inline text (escaped) -->
<script th:inline="javascript">
    var username = /*[[${username}]]*/ 'default';
    // Thymeleaf will properly escape this
</script>
```

### Manual Output Encoding

```java
@Component
public class HtmlSanitizer {

    // Using OWASP Java HTML Sanitizer
    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
        .allowElements("a", "b", "br", "em", "i", "li", "ol", "p", "strong", "ul")
        .allowUrlProtocols("https")
        .allowAttributes("href").onElements("a")
        .requireRelNofollowOnLinks()
        .toFactory();

    public String sanitize(String untrusted) {
        return POLICY.sanitize(untrusted);
    }
}

// In controllers, use HttpServletResponse content type
@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<DataDTO> getData() {
    return ResponseEntity.ok(dataService.getData());
}
```

### Content-Type Response Configuration

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
            .defaultContentType(MediaType.APPLICATION_JSON)
            .favorParameter(false)
            .ignoreAcceptHeader(false)
            .mediaType("json", MediaType.APPLICATION_JSON);
    }
}
```

---

## SQL Injection Prevention

While JDBCTemplate and Hibernate encourage safer practices, always use parameterized queries and ensure that String concatenation is not happening with queries.

### Safe JdbcTemplate Usage

```java
@Repository
@RequiredArgsConstructor
public class UserRepositoryCustom {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    // SAFE - Parameterized query with positional parameters
    public User findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        return jdbcTemplate.queryForObject(sql, userRowMapper, email);
    }

    // SAFE - Named parameters
    public List<User> findByRoleAndStatus(String role, boolean active) {
        String sql = "SELECT * FROM users WHERE role = :role AND active = :active";
        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("role", role)
            .addValue("active", active);
        return namedParameterJdbcTemplate.query(sql, params, userRowMapper);
    }

    // DANGEROUS - String concatenation
    // NEVER DO THIS:
    // String sql = "SELECT * FROM users WHERE email = '" + email + "'";
}
```

### Safe JPA/Hibernate Usage

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // SAFE - Spring Data derived query
    Optional<User> findByEmail(String email);

    // SAFE - JPQL with named parameters
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.active = :active")
    List<User> findByRoleAndActive(@Param("role") String role,
                                    @Param("active") boolean active);

    // SAFE - Native query with parameters
    @Query(value = "SELECT * FROM users WHERE email LIKE :pattern",
           nativeQuery = true)
    List<User> searchByEmail(@Param("pattern") String pattern);
}

// For dynamic queries, use Specification or CriteriaBuilder
@Service
public class UserSearchService {

    public List<User> search(UserSearchCriteria criteria) {
        Specification<User> spec = Specification.where(null);

        if (criteria.getEmail() != null) {
            spec = spec.and((root, query, cb) ->
                cb.like(root.get("email"), "%" + criteria.getEmail() + "%"));
        }

        if (criteria.getRole() != null) {
            spec = spec.and((root, query, cb) ->
                cb.equal(root.get("role"), criteria.getRole()));
        }

        return userRepository.findAll(spec);
    }
}
```

---

## Dependency Management

Use OWASP Dependency Check to identify vulnerabilities in dependent libraries, and maintain a commitment to regular updates.

### Maven Configuration

```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>9.0.9</version>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <suppressionFiles>
            <suppressionFile>dependency-check-suppressions.xml</suppressionFile>
        </suppressionFiles>
        <formats>
            <format>HTML</format>
            <format>JSON</format>
        </formats>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>

<!-- Enforce dependency versions -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <version>3.4.1</version>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals>
                <goal>enforce</goal>
            </goals>
            <configuration>
                <rules>
                    <bannedDependencies>
                        <excludes>
                            <exclude>commons-logging:commons-logging</exclude>
                            <exclude>log4j:log4j</exclude>
                        </excludes>
                    </bannedDependencies>
                    <requireMavenVersion>
                        <version>3.8.0</version>
                    </requireMavenVersion>
                    <requireJavaVersion>
                        <version>17</version>
                    </requireJavaVersion>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Suppression File Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">
    <suppress>
        <notes>False positive - we don't use the affected feature</notes>
        <cve>CVE-2023-XXXXX</cve>
    </suppress>
</suppressions>
```

---

## Sensitive Data Protection

Spring and Jasypt provide straightforward encryption to prevent committing credentials to source control.

### Encrypted Properties with Jasypt

```java
@Configuration
public class JasyptConfig {

    @Bean("jasyptStringEncryptor")
    public StringEncryptor stringEncryptor() {
        PooledPBEStringEncryptor encryptor = new PooledPBEStringEncryptor();
        SimpleStringPBEConfig config = new SimpleStringPBEConfig();

        // Use environment variable for encryption password
        config.setPassword(System.getenv("JASYPT_ENCRYPTOR_PASSWORD"));
        config.setAlgorithm("PBEWITHHMACSHA512ANDAES_256");
        config.setKeyObtentionIterations(10000);
        config.setPoolSize(1);
        config.setSaltGeneratorClassName("org.jasypt.salt.RandomSaltGenerator");
        config.setIvGeneratorClassName("org.jasypt.iv.RandomIvGenerator");

        encryptor.setConfig(config);
        return encryptor;
    }
}
```

### Application Properties

```yaml
# application.yml with encrypted values
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/testcreator
    username: ENC(encrypted_username_here)
    password: ENC(encrypted_password_here)

jwt:
  secret: ENC(encrypted_jwt_secret_here)
```

### Environment-Based Configuration

```java
@Configuration
@ConfigurationProperties(prefix = "app.security")
@Validated
public class SecurityProperties {

    @NotBlank
    private String jwtSecret;

    @Min(3600)
    private int jwtExpirationSeconds;

    @NotEmpty
    private List<String> allowedOrigins;

    // Getters and setters
}
```

---

## Input Validation

Spring MVC provides an easy and clear place to perform input validation (Validators). Use input validation and prefer whitelists.

### Request Validation

```java
public class CreateTestRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Total questions is required")
    @Min(value = 1, message = "Must have at least 1 question")
    @Max(value = 200, message = "Cannot exceed 200 questions")
    private Integer totalQuestions;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score must be positive")
    @Max(value = 100, message = "Passing score cannot exceed 100")
    private Integer passingScore;

    @Future(message = "Test date must be in the future")
    private LocalDateTime testDate;

    @NotEmpty(message = "At least one question is required")
    @Valid  // Cascade validation to nested objects
    private List<CreateQuestionRequest> questions;
}

// Controller with validation
@RestController
@RequestMapping("/api/tests")
public class TestController {

    @PostMapping
    public ResponseEntity<TestDTO> createTest(
            @Valid @RequestBody CreateTestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(testService.create(request));
    }
}
```

### Custom Validators

```java
@Documented
@Constraint(validatedBy = NoHtmlValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface NoHtml {
    String message() default "HTML content is not allowed";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class NoHtmlValidator implements ConstraintValidator<NoHtml, String> {

    private static final Pattern HTML_PATTERN =
        Pattern.compile("<[^>]+>", Pattern.CASE_INSENSITIVE);

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true;
        return !HTML_PATTERN.matcher(value).find();
    }
}

// Usage
public class CommentRequest {
    @NoHtml
    @Size(max = 500)
    private String content;
}
```

### Path Variable and Parameter Validation

```java
@RestController
@RequestMapping("/api/users")
@Validated  // Enable method-level validation
public class UserController {

    @GetMapping("/{id}")
    public UserDTO getUser(
            @PathVariable @Positive Long id) {
        return userService.findById(id);
    }

    @GetMapping
    public Page<UserDTO> getUsers(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) @Pattern(regexp = "^[A-Z]+$") String role) {
        return userService.findAll(PageRequest.of(page, size), role);
    }
}
```

---

## CSRF Protection

### Configuration for Stateful Applications

```java
@Configuration
@EnableWebSecurity
public class CsrfConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                // Ignore CSRF for specific paths (use carefully!)
                .ignoringRequestMatchers("/api/webhooks/**")
            );

        return http.build();
    }
}

// For SPA applications
public class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestAttributeHandler delegate =
        new CsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       Supplier<CsrfToken> csrfToken) {
        delegate.handle(request, response, csrfToken);
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request,
                                         CsrfToken csrfToken) {
        // Check header first (for AJAX requests)
        String headerValue = request.getHeader(csrfToken.getHeaderName());
        return (StringUtils.hasText(headerValue))
            ? headerValue
            : delegate.resolveCsrfTokenValue(request, csrfToken);
    }
}
```

### For Stateless JWT Applications

```java
// Disable CSRF when using stateless JWT authentication
http.csrf(csrf -> csrf.disable())
    .sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

---

## Session Management

### Stateless Configuration (JWT)

```java
@Configuration
@EnableWebSecurity
public class SessionConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter,
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### Stateful Configuration (Server Sessions)

```java
@Configuration
@EnableWebSecurity
public class SessionConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(1)  // One session per user
                .maxSessionsPreventsLogin(true)  // Block new login if max reached
                .expiredUrl("/login?expired")
                .sessionRegistry(sessionRegistry()))
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .clearAuthentication(true));

        return http.build();
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }
}
```

---

## Quick Reference Checklist

| Security Control | Implementation |
|-----------------|----------------|
| Security Headers | `http.headers()` configuration |
| Password Hashing | BCrypt with cost 12+ |
| JWT Security | Strong secret (256+ bits), short expiration |
| SQL Injection | Parameterized queries, JPA repositories |
| XSS | Thymeleaf auto-escaping, output encoding |
| CSRF | `CookieCsrfTokenRepository` or disable for JWT |
| Authorization | `@PreAuthorize`, method-level security |
| Input Validation | `@Valid`, Bean Validation annotations |
| Dependencies | OWASP Dependency Check, version pinning |
| Secrets | Jasypt encryption, environment variables |
