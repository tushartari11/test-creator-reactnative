# CWE/SANS Top 25 Most Dangerous Software Weaknesses (2025)

This reference is loaded by the `security-pen-tester` skill when performing security analysis.
The CWE Top 25 identifies the most dangerous software errors that can lead to serious vulnerabilities.

**Sources:**
- KEV List: https://cwe.mitre.org/top25/archive/2025/2025_kev_list.html
- On The Cusp: https://cwe.mitre.org/top25/archive/2025/2025_onthecusp_list.html
**Version:** 2025 Edition

---

## Table of Contents

1. [2025 CWE Top 10 KEV Weaknesses](#2025-cwe-top-10-kev-weaknesses)
2. [On The Cusp (Ranks 26-40)](#on-the-cusp-ranks-26-40)
3. [Detailed Weakness Descriptions](#detailed-weakness-descriptions)
4. [Prevention Strategies by Category](#prevention-strategies-by-category)

---

## 2025 CWE Top 10 KEV Weaknesses

The KEV (Known Exploited Vulnerabilities) list highlights weaknesses actively exploited in the wild:

| Rank | CWE ID | Weakness Name | Score | CVEs in KEV | Change vs 2024 |
|------|--------|---------------|-------|-------------|----------------|
| 1 | CWE-78 | OS Command Injection | 80.43 | 20 | +2 |
| 2 | CWE-416 | Use After Free | 51.89 | 14 | +7 |
| 3 | CWE-787 | Out-of-bounds Write | 50.39 | 12 | -2 |
| 4 | CWE-306 | Missing Authentication for Critical Function | 50.27 | 11 | +3 |
| 5 | CWE-502 | Deserialization of Untrusted Data | 46.31 | 11 | 0 |
| 6 | CWE-22 | Path Traversal | 36.96 | 10 | 0 |
| 7 | CWE-94 | Code Injection | 26.62 | 7 | -3 |
| 8 | CWE-288 | Authentication Bypass Using Alternate Path | 22.31 | 6 | +6 |
| 9 | CWE-122 | Heap-based Buffer Overflow | 20.25 | 6 | +2 |
| 10 | CWE-79 | Cross-site Scripting (XSS) | 17.99 | 7 | +11 |

**Key Observation:** Command injection vulnerabilities ranked first with the highest score, while XSS showed the most dramatic improvement, climbing 11 positions year-over-year.

---

## On The Cusp (Ranks 26-40)

These 15 weaknesses appear just outside the main Top 25:

| Rank | CWE ID | Weakness Name | Score | KEV CVEs |
|------|--------|---------------|-------|----------|
| 26 | CWE-266 | Incorrect Privilege Assignment | 2.40 | 0 |
| 27 | CWE-276 | Incorrect Default Permissions | 2.37 | 0 |
| 28 | CWE-98 | PHP Remote File Inclusion | 2.32 | 0 |
| 29 | CWE-269 | Improper Privilege Management | 2.08 | 4 |
| 30 | CWE-190 | Integer Overflow or Wraparound | 2.06 | 2 |
| 31 | CWE-287 | Improper Authentication | 2.04 | 2 |
| 32 | CWE-400 | Uncontrolled Resource Consumption | 2.02 | 0 |
| 33 | CWE-288 | Authentication Bypass via Alternate Path | 1.87 | 6 |
| 34 | CWE-427 | Uncontrolled Search Path Element | 1.72 | 0 |
| 35 | CWE-798 | Use of Hard-coded Credentials | 1.59 | 2 |
| 36 | CWE-362 | Race Condition | 1.57 | 0 |
| 37 | CWE-401 | Missing Memory Release | 1.47 | 0 |
| 38 | CWE-732 | Incorrect Permission Assignment | 1.47 | 0 |
| 39 | CWE-119 | Improper Memory Buffer Restriction | 1.43 | 1 |
| 40 | CWE-601 | Open Redirect | 1.41 | 0 |

---

## Detailed Weakness Descriptions

### CWE-78: OS Command Injection (Rank #1)

**Description:** The software constructs all or part of an OS command using externally-influenced input, but does not neutralize special elements that could modify the intended command.

**Impact:** Critical - Allows attackers to execute arbitrary commands on the host operating system.

**Spring Boot Example:**

```java
// VULNERABLE - Command injection
@PostMapping("/convert")
public String convertFile(@RequestParam String filename) throws IOException {
    String command = "convert " + filename + " output.pdf";
    Runtime.getRuntime().exec(command);  // DANGEROUS!
    return "Converted";
}

// SECURE - Input validation and ProcessBuilder
@PostMapping("/convert")
public String convertFile(@RequestParam String filename) throws IOException {
    // Strict validation - only alphanumeric and safe characters
    if (!filename.matches("^[a-zA-Z0-9_\\-\\.]+$")) {
        throw new BadRequestException("Invalid filename");
    }

    // Check for path traversal
    Path filePath = Paths.get(uploadDir, filename).normalize();
    if (!filePath.startsWith(uploadDir)) {
        throw new BadRequestException("Invalid path");
    }

    // Use ProcessBuilder with argument array (no shell interpretation)
    ProcessBuilder pb = new ProcessBuilder("convert", filename, "output.pdf");
    pb.directory(new File(uploadDir));
    pb.start();

    return "Converted";
}
```

---

### CWE-416: Use After Free (Rank #2)

**Description:** Referencing memory after it has been freed can cause a program to crash, use unexpected values, or execute code.

**Impact:** Critical - Can lead to arbitrary code execution.

**Note:** Primarily affects C/C++ code. Java's garbage collection prevents most use-after-free issues, but JNI code is vulnerable.

```java
// JNI considerations - ensure proper memory management
public final class NativeBuffer {

    private long nativePointer;
    private boolean freed = false;

    public synchronized void free() {
        if (!freed) {
            nativeRelease(nativePointer);
            freed = true;
            nativePointer = 0;
        }
    }

    public synchronized byte[] getData() {
        if (freed) {
            throw new IllegalStateException("Buffer already freed");
        }
        return nativeGetData(nativePointer);
    }

    private native void nativeRelease(long ptr);
    private native byte[] nativeGetData(long ptr);
}
```

---

### CWE-787: Out-of-bounds Write (Rank #3)

**Description:** The software writes data past the end, or before the beginning, of the intended buffer.

**Impact:** Critical - Can corrupt data, crash the application, or execute arbitrary code.

**Java Mitigation:** Java's array bounds checking prevents most issues, but native code remains vulnerable.

```java
// Safe array operations in Java
public void copyData(byte[] source, byte[] dest, int length) {
    // Always validate bounds before copying
    Objects.checkFromIndexSize(0, length, source.length);
    Objects.checkFromIndexSize(0, length, dest.length);

    System.arraycopy(source, 0, dest, 0, length);
}

// JNI code must manually check bounds
// In native code:
// JNIEXPORT void JNICALL Java_MyClass_nativeCopy(
//     JNIEnv *env, jobject obj, jbyteArray src, jbyteArray dst, jint len) {
//     jsize srcLen = (*env)->GetArrayLength(env, src);
//     jsize dstLen = (*env)->GetArrayLength(env, dst);
//     if (len < 0 || len > srcLen || len > dstLen) {
//         (*env)->ThrowNew(env, (*env)->FindClass(env, "java/lang/IndexOutOfBoundsException"), "Invalid length");
//         return;
//     }
//     // Proceed with copy
// }
```

---

### CWE-306: Missing Authentication for Critical Function (Rank #4)

**Description:** The software does not perform any authentication for functionality that requires a provable user identity.

**Impact:** High - Allows unauthorized access to sensitive operations.

**Spring Boot Example:**

```java
// VULNERABLE - No authentication check
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);  // No auth check!
    }
}

// SECURE - Proper authentication and authorization
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")  // Require ADMIN role
public class AdminController {

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")  // Specific permission
    public ResponseEntity<Void> deleteUser(@PathVariable Long id,
                                            @AuthenticationPrincipal UserDetails user) {
        // Log the action
        auditService.log("USER_DELETE", user.getUsername(), id);

        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

// Security configuration
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated()
        );
        return http.build();
    }
}
```

---

### CWE-502: Deserialization of Untrusted Data (Rank #5)

**Description:** The application deserializes untrusted data without sufficiently verifying that the resulting data will be valid.

**Impact:** Critical - Can lead to remote code execution.

**Spring Boot Example:**

```java
// VULNERABLE - Deserializing untrusted data
@PostMapping("/import")
public void importData(@RequestBody byte[] data) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    Object obj = ois.readObject();  // EXTREMELY DANGEROUS!
    processObject(obj);
}

// SECURE Option 1 - Use JSON instead of Java serialization
@PostMapping("/import")
public void importData(@RequestBody @Valid ImportDataDTO data) {
    // Jackson handles JSON parsing safely
    processData(data);
}

// SECURE Option 2 - Use serialization filter (JDK 9+)
@PostMapping("/import-legacy")
public void importLegacyData(@RequestBody byte[] data) throws Exception {
    ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
        "com.myapp.dto.*;java.util.*;!*"  // Strict allowlist
    );

    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    ois.setObjectInputFilter(filter);

    Object obj = ois.readObject();
    processObject(obj);
}

// Global filter configuration
// In JVM arguments: -Djdk.serialFilter=com.myapp.dto.*;java.util.*;!*
```

---

### CWE-22: Path Traversal (Rank #6)

**Description:** The software uses external input to construct a pathname but does not properly neutralize sequences like "../" that can resolve outside the intended directory.

**Impact:** High - Can read or write arbitrary files on the system.

**Spring Boot Example:**

```java
// VULNERABLE - Path traversal
@GetMapping("/files/{filename}")
public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
    Path filePath = Paths.get("/uploads/" + filename);
    Resource resource = new FileSystemResource(filePath);
    return ResponseEntity.ok(resource);  // Can access /etc/passwd with ../../../etc/passwd
}

// SECURE - Path validation
@GetMapping("/files/{filename}")
public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
    // Normalize and validate path
    Path basePath = Paths.get("/uploads").toAbsolutePath().normalize();
    Path filePath = basePath.resolve(filename).normalize();

    // Ensure resolved path is within base directory
    if (!filePath.startsWith(basePath)) {
        throw new BadRequestException("Invalid file path");
    }

    // Validate filename characters
    if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
        throw new BadRequestException("Invalid filename");
    }

    if (!Files.exists(filePath)) {
        throw new ResourceNotFoundException("File not found");
    }

    Resource resource = new FileSystemResource(filePath);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(resource);
}
```

---

### CWE-94: Code Injection (Rank #7)

**Description:** The software constructs all or part of a code segment using externally-influenced input but does not neutralize special elements that could modify the syntax or behavior.

**Impact:** Critical - Allows execution of arbitrary code.

**Spring Boot Example:**

```java
// VULNERABLE - Expression Language injection
@GetMapping("/evaluate")
public String evaluate(@RequestParam String expression) {
    ExpressionParser parser = new SpelExpressionParser();
    Expression exp = parser.parseExpression(expression);
    return exp.getValue().toString();  // Can execute arbitrary code!
}

// VULNERABLE - Script injection
@PostMapping("/script")
public Object runScript(@RequestBody String script) throws Exception {
    ScriptEngine engine = new ScriptEngineManager().getEngineByName("javascript");
    return engine.eval(script);  // DANGEROUS!
}

// SECURE - Avoid dynamic code execution, use predefined operations
@GetMapping("/calculate")
public CalculationResult calculate(@RequestParam String operation,
                                    @RequestParam Double a,
                                    @RequestParam Double b) {
    // Allowlist of operations
    return switch (operation) {
        case "add" -> new CalculationResult(a + b);
        case "subtract" -> new CalculationResult(a - b);
        case "multiply" -> new CalculationResult(a * b);
        case "divide" -> {
            if (b == 0) throw new BadRequestException("Division by zero");
            yield new CalculationResult(a / b);
        }
        default -> throw new BadRequestException("Unknown operation");
    };
}

// If SpEL is required, use SimpleEvaluationContext (restricted)
public String safeEvaluate(String expression, Map<String, Object> context) {
    ExpressionParser parser = new SpelExpressionParser();
    Expression exp = parser.parseExpression(expression);

    // Use restricted evaluation context
    SimpleEvaluationContext evalContext = SimpleEvaluationContext
        .forReadOnlyDataBinding()
        .withRootObject(context)
        .build();

    return exp.getValue(evalContext, String.class);
}
```

---

### CWE-288: Authentication Bypass Using Alternate Path (Rank #8)

**Description:** A product requires authentication, but the product has an alternate path that does not require authentication.

**Impact:** High - Complete authentication bypass.

**Spring Boot Example:**

```java
// VULNERABLE - Inconsistent URL patterns
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/users/**").authenticated()
            // Missing: /api/user/** (singular) is unprotected!
        );
        return http.build();
    }
}

// VULNERABLE - Multiple endpoints for same resource
@RestController
public class UserController {

    @GetMapping("/api/users/{id}")  // Protected
    @PreAuthorize("isAuthenticated()")
    public UserDTO getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @GetMapping("/internal/user/{id}")  // Unprotected alternate path!
    public UserDTO getUserInternal(@PathVariable Long id) {
        return userService.findById(id);
    }
}

// SECURE - Comprehensive security configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            // Explicit public paths
            .requestMatchers("/api/public/**").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/actuator/health").permitAll()
            // Everything else requires authentication (deny by default)
            .anyRequest().authenticated()
        );
        return http.build();
    }
}
```

---

### CWE-122: Heap-based Buffer Overflow (Rank #9)

**Description:** A heap overflow condition occurs when the program writes to heap memory beyond the allocated buffer size.

**Impact:** Critical - Can lead to arbitrary code execution.

**Note:** Java's memory management prevents most heap overflows, but JNI code is vulnerable.

```java
// Safe heap usage in Java - let JVM manage memory
public class SafeBuffer {

    private byte[] buffer;

    public SafeBuffer(int size) {
        if (size <= 0 || size > MAX_BUFFER_SIZE) {
            throw new IllegalArgumentException("Invalid buffer size");
        }
        this.buffer = new byte[size];  // JVM handles allocation safely
    }

    public void write(byte[] data, int offset) {
        // Java throws ArrayIndexOutOfBoundsException if invalid
        System.arraycopy(data, 0, buffer, offset, data.length);
    }
}

// For JNI - always validate sizes
// Native code must check bounds before writing to heap
```

---

### CWE-79: Cross-site Scripting (XSS) (Rank #10)

**Description:** The software does not neutralize or incorrectly neutralizes user-controllable input before it is placed in output that is used as a web page served to other users.

**Impact:** Medium to High - Can steal sessions, deface websites, or deliver malware.

**Spring Boot Example:**

```java
// VULNERABLE - Reflected XSS
@GetMapping("/search")
@ResponseBody
public String search(@RequestParam String query) {
    return "<html><body>Results for: " + query + "</body></html>";
}

// VULNERABLE - Stored XSS
@PostMapping("/comments")
public void saveComment(@RequestBody CommentDTO comment) {
    commentRepository.save(comment);  // Stored without sanitization
}

@GetMapping("/comments")
public List<CommentDTO> getComments() {
    return commentRepository.findAll();  // Returns unsanitized content
}

// SECURE - Use Thymeleaf (auto-escaping)
@GetMapping("/search")
public String search(@RequestParam String query, Model model) {
    model.addAttribute("query", query);
    return "search-results";  // Thymeleaf auto-escapes ${query}
}

// SECURE - HTML sanitization for rich content
@Service
public class HtmlSanitizer {

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
        .allowElements("b", "i", "em", "strong", "p", "br", "ul", "ol", "li")
        .allowUrlProtocols("https")
        .toFactory();

    public String sanitize(String untrustedHtml) {
        return POLICY.sanitize(untrustedHtml);
    }
}

@PostMapping("/comments")
public void saveComment(@RequestBody @Valid CommentDTO comment) {
    // Sanitize before storage
    comment.setContent(htmlSanitizer.sanitize(comment.getContent()));
    commentRepository.save(comment);
}

// Content-Security-Policy header
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.headers(headers -> headers
        .contentSecurityPolicy(csp -> csp
            .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"))
    );
    return http.build();
}
```

---

## Prevention Strategies by Category

### Injection Prevention (CWE-78, CWE-94, CWE-79)

```java
@Configuration
public class InjectionPreventionConfig {

    // 1. Input validation service
    @Bean
    public InputValidator inputValidator() {
        return new InputValidator()
            .addRule("filename", "[a-zA-Z0-9_\\-\\.]+")
            .addRule("username", "[a-zA-Z0-9_]+")
            .addRule("email", "^[\\w-\\.]+@[\\w-\\.]+$")
            .addMaxLength("comment", 2000)
            .addMaxLength("query", 500);
    }

    // 2. Output encoding service
    @Bean
    public OutputEncoder outputEncoder() {
        return new OutputEncoder()
            .htmlEncoder(HtmlEncoder.getInstance())
            .jsEncoder(JavaScriptEncoder.getInstance())
            .urlEncoder(UrlEncoder.getInstance());
    }
}

@Service
@RequiredArgsConstructor
public class SecureCommandService {

    private final Set<String> allowedCommands = Set.of("convert", "resize", "compress");

    public void executeCommand(String command, List<String> args) {
        // Validate command against allowlist
        if (!allowedCommands.contains(command)) {
            throw new SecurityException("Command not allowed: " + command);
        }

        // Validate arguments
        for (String arg : args) {
            if (arg.contains(";") || arg.contains("|") || arg.contains("&")) {
                throw new SecurityException("Invalid argument characters");
            }
        }

        // Use ProcessBuilder (no shell interpretation)
        List<String> fullCommand = new ArrayList<>();
        fullCommand.add(command);
        fullCommand.addAll(args);

        ProcessBuilder pb = new ProcessBuilder(fullCommand);
        pb.directory(sandboxDirectory);
        pb.redirectErrorStream(true);
        pb.start();
    }
}
```

### Authentication/Authorization Prevention (CWE-306, CWE-288)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class AuthSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Deny by default
            .authorizeHttpRequests(auth -> auth
                // Explicit public endpoints
                .requestMatchers(
                    "/api/public/**",
                    "/api/auth/login",
                    "/api/auth/register",
                    "/actuator/health"
                ).permitAll()
                // Admin endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // All other requests require authentication
                .anyRequest().authenticated()
            )
            // Ensure no alternate paths exist
            .securityMatcher("/**");

        return http.build();
    }

    // Security audit - detect unprotected endpoints
    @Bean
    public CommandLineRunner securityAudit(
            RequestMappingHandlerMapping mapping) {
        return args -> {
            mapping.getHandlerMethods().forEach((info, method) -> {
                // Log all endpoints for review
                log.info("Endpoint: {} -> {}",
                    info.getPatternsCondition(),
                    method.getMethod().getName());
            });
        };
    }
}
```

### Memory Safety (CWE-416, CWE-787, CWE-122)

```java
// For Java applications using JNI
public class MemorySafetyGuidelines {

    // 1. Always validate array bounds
    public void processArray(byte[] data, int offset, int length) {
        Objects.checkFromIndexSize(offset, length, data.length);
        // Safe to process
    }

    // 2. Use try-with-resources for native resources
    public void processNativeResource() {
        try (NativeResource resource = new NativeResource()) {
            resource.process();
        }  // Automatically freed
    }

    // 3. Prevent integer overflow in size calculations
    public byte[] allocateBuffer(int count, int elementSize) {
        long totalSize = Math.multiplyExact((long) count, elementSize);
        if (totalSize > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Size overflow");
        }
        return new byte[(int) totalSize];
    }
}
```

### Serialization Safety (CWE-502)

```java
@Configuration
public class SerializationSafetyConfig {

    // Global serialization filter
    @PostConstruct
    public void configureSerializationFilter() {
        ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
            "maxdepth=10;" +
            "maxrefs=1000;" +
            "maxbytes=1000000;" +
            "com.myapp.dto.*;" +
            "java.util.*;" +
            "java.time.*;" +
            "!*"  // Reject everything else
        );
        ObjectInputFilter.Config.setSerialFilter(filter);
    }

    // Prefer JSON for external data
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}
```

---

## Quick Reference Matrix

| CWE ID | Name | Java Relevance | Primary Defense |
|--------|------|----------------|-----------------|
| CWE-78 | OS Command Injection | High | ProcessBuilder, input validation |
| CWE-416 | Use After Free | JNI only | Proper memory management |
| CWE-787 | Out-of-bounds Write | JNI only | Bounds checking |
| CWE-306 | Missing Authentication | High | Spring Security, @PreAuthorize |
| CWE-502 | Insecure Deserialization | Critical | JSON, serialization filters |
| CWE-22 | Path Traversal | High | Path normalization, validation |
| CWE-94 | Code Injection | High | Avoid dynamic code, allowlists |
| CWE-288 | Auth Bypass | High | Deny-by-default, audit endpoints |
| CWE-122 | Heap Overflow | JNI only | Bounds checking |
| CWE-79 | XSS | High | Output encoding, CSP |
| CWE-190 | Integer Overflow | Medium | Math.addExact, validation |
| CWE-798 | Hard-coded Credentials | High | Environment variables, secrets management |
| CWE-400 | Resource Exhaustion | High | Rate limiting, timeouts |
| CWE-601 | Open Redirect | Medium | URL allowlists, validation |

---

## Testing Checklist

- [ ] **CWE-78:** Test all command execution points with shell metacharacters
- [ ] **CWE-306:** Enumerate all endpoints and verify authentication requirements
- [ ] **CWE-502:** Identify all deserialization points and test with gadget chains
- [ ] **CWE-22:** Test file operations with path traversal sequences
- [ ] **CWE-94:** Test all user input that influences code execution
- [ ] **CWE-288:** Map all routes and verify no alternate paths bypass auth
- [ ] **CWE-79:** Test all user input reflection points for XSS
- [ ] **CWE-798:** Search codebase for hardcoded credentials
- [ ] **CWE-400:** Test rate limiting and resource consumption limits
- [ ] **CWE-601:** Test all redirect functionality for open redirects
