# OWASP Top 10 Web Application Security Risks

This reference is loaded by the `security-pen-tester` skill when performing security analysis
on web applications. Guidelines are drawn from OWASP's Top 10 Project.

**Source:** https://owasp.org/Top10/2025/
**Version:** 2025 Edition (with detailed content from 2021 where 2025 details pending)

---

## Table of Contents

1. [A01:2025 - Broken Access Control](#a012025---broken-access-control)
2. [A02:2025 - Security Misconfiguration](#a022025---security-misconfiguration)
3. [A03:2025 - Software Supply Chain Failures](#a032025---software-supply-chain-failures)
4. [A04:2025 - Cryptographic Failures](#a042025---cryptographic-failures)
5. [A05:2025 - Injection](#a052025---injection)
6. [A06:2025 - Insecure Design](#a062025---insecure-design)
7. [A07:2025 - Authentication Failures](#a072025---authentication-failures)
8. [A08:2025 - Software or Data Integrity Failures](#a082025---software-or-data-integrity-failures)
9. [A09:2025 - Security Logging and Alerting Failures](#a092025---security-logging-and-alerting-failures)
10. [A10:2025 - Mishandling of Exceptional Conditions](#a102025---mishandling-of-exceptional-conditions)

---

## A01:2025 - Broken Access Control

### Overview
Broken Access Control moved to the #1 position in OWASP's rankings. Testing found 94% of applications vulnerable to some form of this issue, with an average incidence rate of 3.81% and over 318,000 occurrences documented.

### Core Definition
Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically result in unauthorized data disclosure, modification, destruction, or unauthorized business functions.

### Common Vulnerability Patterns
- Failing to apply least privilege principles or deny-by-default access policies
- Circumventing checks through URL manipulation, parameter tampering, or API request modification
- Accessing others' accounts via insecure direct object references (IDOR)
- Missing access controls on POST, PUT, and DELETE operations
- Privilege escalation and JWT/cookie tampering
- CORS misconfiguration enabling unauthorized API access
- Unauthenticated access to restricted pages

### Prevention Recommendations
- Implement server-side access control that attackers cannot modify
- Apply deny-by-default for non-public resources
- Enforce record ownership in data models
- Invalidate session tokens server-side after logout
- Implement short-lived stateless tokens
- Log failures and alert administrators appropriately
- Include functional access control testing throughout development

### Related CWEs
34 Common Weakness Enumerations map to this category:
- CWE-284 (Improper Access Control)
- CWE-862 (Missing Authorization)
- CWE-352 (CSRF)
- CWE-200 (Information Exposure)

### Spring Boot Example

```java
// BAD - No ownership check
@DeleteMapping("/documents/{id}")
public void deleteDocument(@PathVariable Long id) {
    documentRepository.deleteById(id);  // Any user can delete any document!
}

// GOOD - Ownership verification
@DeleteMapping("/documents/{id}")
@PreAuthorize("hasRole('USER')")
public void deleteDocument(@PathVariable Long id,
                           @AuthenticationPrincipal UserDetails user) {
    Document doc = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

    if (!doc.getOwnerId().equals(user.getId())) {
        throw new ForbiddenException("You can only delete your own documents");
    }

    documentRepository.delete(doc);
    log.info("Document {} deleted by user {}", id, user.getUsername());
}
```

---

## A02:2025 - Security Misconfiguration

### Overview
Security misconfiguration vulnerabilities occur when applications are improperly configured, leaving them vulnerable to attack. This includes insecure default configurations, incomplete configurations, and misconfigured HTTP headers.

### Common Issues
- Default credentials left unchanged
- Unnecessary features enabled (debug modes, admin consoles)
- Missing security headers
- Verbose error messages exposing stack traces
- Outdated or vulnerable software components
- Insecure cloud storage permissions
- Missing TLS configuration

### Prevention Strategies
- Implement repeatable hardening processes
- Disable unused features and frameworks
- Review and update configurations regularly
- Use infrastructure as code for consistent deployments
- Implement proper error handling that doesn't expose sensitive information
- Perform regular security configuration audits

### Spring Boot Example

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Security headers
            .headers(headers -> headers
                .contentTypeOptions(Customizer.withDefaults())
                .xssProtection(Customizer.withDefaults())
                .cacheControl(Customizer.withDefaults())
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .frameOptions(frame -> frame.deny())
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self'"))
            )
            // Disable unnecessary features
            .csrf(csrf -> csrf.disable())  // Only if using JWT
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}

// application-prod.yml
spring:
  devtools:
    add-properties: false  # Disable dev tools in production
  datasource:
    hikari:
      maximum-pool-size: 20

# Error handling - don't expose stack traces
server:
  error:
    include-stacktrace: never
    include-message: never
```

---

## A03:2025 - Software Supply Chain Failures

### Overview
This category addresses vulnerabilities introduced through third-party components, libraries, and CI/CD pipeline compromises. Supply chain attacks have increased dramatically, targeting open-source ecosystems.

### Common Issues
- Using components with known vulnerabilities
- Lack of dependency version pinning
- No integrity verification of downloaded packages
- Compromised build pipelines
- Typosquatting attacks on package names
- Unmaintained or abandoned dependencies

### Prevention Strategies
- Maintain a software bill of materials (SBOM)
- Use dependency scanning tools (OWASP Dependency-Check, Snyk)
- Pin dependency versions and verify checksums
- Monitor for CVEs affecting your dependencies
- Implement secure CI/CD pipeline practices
- Review and audit third-party code before inclusion

### Maven Example

```xml
<!-- pom.xml - Dependency management with version pinning -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.2.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- OWASP Dependency Check plugin -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>9.0.0</version>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

---

## A04:2025 - Cryptographic Failures

### Overview
Previously known as "Sensitive Data Exposure," this category focuses on failures related to cryptography that lead to exposure of sensitive data.

### Common Issues
- Transmitting data in clear text (HTTP, SMTP, FTP)
- Using deprecated cryptographic algorithms (MD5, SHA1, DES)
- Weak key generation or management
- Not enforcing encryption through security headers
- Improper certificate validation
- Using encryption without authentication (ECB mode)

### Prevention Strategies
- Classify data by sensitivity level
- Encrypt all sensitive data at rest and in transit
- Use strong, up-to-date algorithms (AES-256, RSA-2048+, SHA-256+)
- Enforce HTTPS with HSTS headers
- Store passwords using strong adaptive hashing (bcrypt, Argon2)
- Disable caching for sensitive data responses

### Spring Boot Example

```java
@Configuration
public class CryptoConfig {

    // Password hashing with BCrypt
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // Cost factor 12
    }
}

@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;

    public byte[] encrypt(byte[] data, SecretKey key) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom.getInstanceStrong().nextBytes(iv);

        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);

        byte[] encrypted = cipher.doFinal(data);

        // Prepend IV to ciphertext
        byte[] result = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, result, 0, iv.length);
        System.arraycopy(encrypted, 0, result, iv.length, encrypted.length);

        return result;
    }
}

// BAD - Weak algorithm
public String hashPassword(String password) {
    return DigestUtils.md5Hex(password);  // MD5 is broken!
}

// GOOD - Strong adaptive hashing
public String hashPassword(String password) {
    return passwordEncoder.encode(password);  // BCrypt with salt
}
```

---

## A05:2025 - Injection

### Overview
Injection vulnerabilities occur when user-supplied data is not validated, filtered, or sanitized by the application, or when dynamic queries or non-parameterized calls without context-aware escaping are used directly in the interpreter.

### Prevalence
- Affects 94% of tested applications
- Maximum incidence rate: 19.09%
- Total documented occurrences: 274,228

### Common Injection Types
- SQL Injection
- NoSQL Injection
- OS Command Injection
- ORM Injection
- LDAP Injection
- Expression Language (EL) and OGNL Injection
- Cross-site Scripting (XSS)

### Prevention Strategies
1. **Safe APIs**: Employ parameterized interfaces or ORM tools that avoid interpreter exposure
2. **Input Validation**: Implement positive server-side validation
3. **Escaping**: Use context-specific escape syntax for residual dynamic queries
4. **Important caveat**: Table names and column names cannot be escaped

### Related CWEs
33 Common Weakness Enumerations map to injection vulnerabilities:
- CWE-89 (SQL Injection)
- CWE-79 (XSS)
- CWE-78 (OS Command Injection)

### Spring Boot Examples

```java
// ===== SQL INJECTION =====

// BAD - String concatenation
public User findUser(String username) {
    String query = "SELECT * FROM users WHERE username = '" + username + "'";
    return jdbcTemplate.queryForObject(query, userMapper);
}

// GOOD - Parameterized query
public User findUser(String username) {
    String query = "SELECT * FROM users WHERE username = ?";
    return jdbcTemplate.queryForObject(query, userMapper, username);
}

// GOOD - JPA/Hibernate with named parameters
@Query("SELECT u FROM User u WHERE u.username = :username")
Optional<User> findByUsername(@Param("username") String username);


// ===== COMMAND INJECTION =====

// BAD - Unvalidated command input
public void processFile(String filename) throws IOException {
    Runtime.getRuntime().exec("process.sh " + filename);  // Command injection!
}

// GOOD - Validate and use ProcessBuilder
public void processFile(String filename) throws IOException {
    if (!filename.matches("[a-zA-Z0-9_\\-\\.]+")) {
        throw new IllegalArgumentException("Invalid filename");
    }
    ProcessBuilder pb = new ProcessBuilder("./process.sh", filename);
    pb.start();
}


// ===== XSS PREVENTION =====

// In Thymeleaf templates - automatic escaping
// <p th:text="${userInput}"></p>  // Safe - auto-escaped

// BAD - Unescaped output
// <p th:utext="${userInput}"></p>  // Vulnerable!

// In Spring MVC - return safe content type
@GetMapping(value = "/data", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<DataDTO> getData() {
    return ResponseEntity.ok(dataService.getData());
}
```

---

## A06:2025 - Insecure Design

### Overview
Insecure design represents a broad category focusing on risks related to design and architectural flaws. This is different from implementation bugs - it's about missing or ineffective security controls at the design level.

### Common Issues
- Missing threat modeling during design phase
- Lack of security requirements
- No secure design patterns applied
- Business logic flaws
- Missing rate limiting by design
- Insufficient segregation between tenants

### Prevention Strategies
- Establish secure development lifecycle with security requirements
- Use threat modeling for critical authentication, access control, and business logic
- Write unit and integration tests to validate security controls
- Design for failure - implement proper error handling
- Apply principle of least privilege in architecture
- Implement defense in depth

### Design Patterns Example

```java
// Secure design pattern: Authorization service with audit
@Service
@RequiredArgsConstructor
public class SecureDocumentService {

    private final DocumentRepository documentRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public DocumentDTO getDocument(Long documentId, UserDetails user) {
        // 1. Verify document exists
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        // 2. Check authorization (designed-in security control)
        if (!authorizationService.canRead(user, document)) {
            auditService.logUnauthorizedAccess(user, document);
            throw new ForbiddenException("Access denied");
        }

        // 3. Audit successful access
        auditService.logAccess(user, document, AccessType.READ);

        return documentMapper.toDTO(document);
    }
}

// Rate limiting by design
@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiter apiRateLimiter() {
        return RateLimiter.of("api",
            RateLimiterConfig.custom()
                .limitForPeriod(100)
                .limitRefreshPeriod(Duration.ofMinutes(1))
                .timeoutDuration(Duration.ofSeconds(5))
                .build());
    }
}
```

---

## A07:2025 - Authentication Failures

### Overview
Previously "Broken Authentication," this category covers vulnerabilities in identity verification, session management, and credential handling.

### Common Issues
- Weak password policies
- Missing multi-factor authentication
- Session fixation vulnerabilities
- Improper session invalidation on logout
- Credentials exposed in URLs or logs
- Missing account lockout mechanisms

### Prevention Strategies
- Implement multi-factor authentication
- Enforce strong password policies
- Use secure session management
- Implement account lockout after failed attempts
- Hash passwords with modern algorithms (bcrypt, Argon2)
- Regenerate session IDs after login

### Spring Boot Example

```java
@Configuration
@EnableWebSecurity
public class AuthenticationConfig {

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;

    @Transactional
    public AuthResponse authenticate(LoginRequest request) {
        // Check for lockout
        if (loginAttemptService.isLocked(request.getEmail())) {
            throw new AccountLockedException(
                "Account locked. Try again in 15 minutes.");
        }

        User user = userRepository.findByEmail(request.getEmail())
            .orElse(null);

        if (user == null ||
            !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailedAttempt(request.getEmail());
            throw new BadCredentialsException("Invalid credentials");
        }

        // Clear failed attempts on success
        loginAttemptService.clearAttempts(request.getEmail());

        // Generate new session/token
        String token = jwtService.generateToken(user);

        return new AuthResponse(token, user.getRole());
    }
}
```

---

## A08:2025 - Software or Data Integrity Failures

### Overview
This category focuses on code and infrastructure that fails to protect against integrity violations, including insecure deserialization, CI/CD pipeline vulnerabilities, and auto-update without integrity verification.

### Common Issues
- Insecure deserialization
- CI/CD pipeline vulnerabilities
- Auto-updates without signature verification
- Unsigned or unencrypted serialized data
- Missing integrity checks on critical data

### Prevention Strategies
- Use digital signatures for software and data
- Verify integrity of dependencies and updates
- Implement secure CI/CD pipelines
- Avoid serialization of sensitive data
- Use serialization filters if deserialization is necessary

### Spring Boot Example

```java
// Avoid Java deserialization of untrusted data
// If necessary, use serialization filters (JDK 9+)

// GOOD - Use JSON instead of Java serialization
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Disable dangerous features
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        return mapper;
    }
}

// BAD - Deserializing untrusted data
public Object deserialize(byte[] data) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    return ois.readObject();  // Dangerous!
}

// GOOD - Use allowlist filtering (JDK 9+)
public Object deserialize(byte[] data) throws Exception {
    ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
        "com.myapp.dto.*;!*");  // Only allow specific packages

    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    ois.setObjectInputFilter(filter);
    return ois.readObject();
}
```

---

## A09:2025 - Security Logging and Alerting Failures

### Overview
Without proper logging and monitoring, breaches cannot be detected. This category covers insufficient logging, missing alerts, and inadequate incident response capabilities.

### Common Issues
- Login failures not logged
- Warnings and errors generate no log messages
- Logs not monitored for suspicious activity
- Log data not protected from tampering
- No alerting thresholds or escalation procedures

### Prevention Strategies
- Log all authentication attempts, access control failures, and input validation failures
- Ensure logs contain sufficient context for forensics
- Protect log integrity
- Implement real-time alerting for suspicious patterns
- Establish incident response procedures

### Spring Boot Example

```java
@Aspect
@Component
@Slf4j
public class SecurityAuditAspect {

    @AfterThrowing(
        pointcut = "execution(* com.myapp.service.*.*(..))",
        throwing = "ex")
    public void logSecurityException(JoinPoint jp, Exception ex) {
        if (ex instanceof AccessDeniedException ||
            ex instanceof AuthenticationException) {

            MDC.put("method", jp.getSignature().toShortString());
            MDC.put("user", SecurityContextHolder.getContext()
                .getAuthentication().getName());

            log.warn("Security exception: {} - {}",
                ex.getClass().getSimpleName(), ex.getMessage());

            MDC.clear();
        }
    }
}

@Service
@Slf4j
public class AuditService {

    public void logLoginAttempt(String email, boolean success, String ip) {
        if (success) {
            log.info("LOGIN_SUCCESS: user={}, ip={}", email, ip);
        } else {
            log.warn("LOGIN_FAILURE: user={}, ip={}", email, ip);
        }
    }

    public void logAccessDenied(String user, String resource) {
        log.warn("ACCESS_DENIED: user={}, resource={}", user, resource);
    }

    public void logSensitiveOperation(String user, String operation,
                                       String details) {
        log.info("SENSITIVE_OP: user={}, op={}, details={}",
            user, operation, details);
    }
}

// logback-spring.xml - Tamper-evident logging
// Use append-only log destinations and integrity verification
```

---

## A10:2025 - Mishandling of Exceptional Conditions

### Overview
This new category in 2025 addresses how applications handle errors, edge cases, and exceptional conditions that can lead to security vulnerabilities.

### Common Issues
- Verbose error messages exposing system information
- Inconsistent error handling across the application
- Resource leaks during exception handling
- Fail-open rather than fail-closed behavior
- Missing null checks leading to crashes

### Prevention Strategies
- Implement global exception handling
- Return generic error messages to users
- Log detailed errors server-side only
- Design fail-closed behavior for security decisions
- Use finally blocks to ensure resource cleanup

### Spring Boot Example

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Log detailed error, return generic message
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {

        String errorId = UUID.randomUUID().toString();

        // Log full details for debugging
        log.error("Error ID: {} - {} at {}",
            errorId, ex.getMessage(), request.getRequestURI(), ex);

        // Return minimal info to client
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(
                "An unexpected error occurred",
                errorId));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(ex.getMessage(), null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex) {
        // Don't reveal why access was denied
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("Access denied", null));
    }
}

// Fail-closed authorization
@Service
public class AuthorizationService {

    public boolean canAccess(UserDetails user, Resource resource) {
        try {
            // Authorization logic
            return checkPermissions(user, resource);
        } catch (Exception e) {
            // Fail closed - deny access on any error
            log.error("Authorization check failed, denying access", e);
            return false;
        }
    }
}
```

---

## Quick Reference Matrix

| Risk | Primary Defense | Key CWE |
|------|-----------------|---------|
| A01: Broken Access Control | Server-side authorization, RBAC | CWE-284 |
| A02: Security Misconfiguration | Hardening, security headers | CWE-16 |
| A03: Supply Chain | SBOM, dependency scanning | CWE-829 |
| A04: Cryptographic Failures | Strong encryption, HTTPS | CWE-327 |
| A05: Injection | Parameterized queries, input validation | CWE-89, CWE-79 |
| A06: Insecure Design | Threat modeling, secure patterns | CWE-501 |
| A07: Authentication Failures | MFA, strong passwords, lockout | CWE-287 |
| A08: Integrity Failures | Digital signatures, secure deserialization | CWE-502 |
| A09: Logging Failures | Comprehensive logging, alerting | CWE-778 |
| A10: Exception Handling | Global handlers, fail-closed | CWE-755 |
