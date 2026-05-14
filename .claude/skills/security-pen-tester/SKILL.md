---
name: security-pen-tester
description: >
  Identifies security vulnerabilities and provides remediation guidance for Java/Spring Boot
  applications. Use this skill when the user asks for a security audit, pen test, vulnerability
  scan, or wants to review authentication, authorization, input validation, API security, or
  database security. Trigger when the user mentions OWASP, CVEs, JWT security, SQL injection,
  XSS, CSRF, or asks to review any security-sensitive code path.
---

# Security Penetration Testing Agent

## Purpose
Identifies security vulnerabilities and provides remediation guidance.

## Security Checks

### 1. OWASP Top 10
- **A01: Broken Access Control**
  - Missing authorization checks
  - Insecure direct object references
  - Path traversal vulnerabilities

- **A02: Cryptographic Failures**
  - Weak encryption algorithms
  - Exposed sensitive data
  - Missing encryption at rest/transit

- **A03: Injection**
  - SQL injection
  - NoSQL injection
  - Command injection
  - LDAP injection

- **A04: Insecure Design**
  - Missing security requirements
  - Inadequate threat modeling
  - Business logic flaws

- **A05: Security Misconfiguration**
  - Default credentials
  - Unnecessary features enabled
  - Verbose error messages
  - Missing security headers

- **A06: Vulnerable Components**
  - Outdated dependencies
  - Known CVEs in libraries
  - Unpatched frameworks

- **A07: Authentication Failures**
  - Weak password policies
  - Missing MFA
  - Session management issues
  - Credential stuffing vulnerabilities

- **A08: Software & Data Integrity**
  - Unsigned packages
  - Unverified CI/CD pipelines
  - Auto-update without verification

- **A09: Security Logging Failures**
  - Insufficient logging
  - Missing audit trails
  - Exposed sensitive data in logs

- **A10: Server-Side Request Forgery**
  - Unvalidated URLs
  - Internal resource access
  - Cloud metadata exposure

### 2. Authentication & Authorization
- JWT implementation security
- Token expiration handling
- Refresh token security
- Role-based access control
- Permission checks

### 3. Input Validation
- Request parameter validation
- File upload security
- Content-Type validation
- Size limits
- Format validation

### 4. API Security
- Rate limiting
- CORS configuration
- API key security
- Request signing
- Response sanitization

### 5. Database Security
- SQL injection prevention
- Connection string security
- Least privilege access
- Encrypted connections
- Sensitive data encryption

### 6. Session Management
- Secure session tokens
- Session timeout
- Logout functionality
- Concurrent session handling

## How to Use

Request security review:
- "Check for security vulnerabilities in PaymentController"
- "Review authentication implementation"
- "Perform security audit on subscription flow"

## Example Security Report

```
Security Assessment: PaymentController.java

Risk Level: HIGH

Critical Vulnerabilities (2):

1. SQL Injection - Line 45
   Severity: CRITICAL
   Risk: Database compromise, data theft

   Issue:
   String query = "SELECT * FROM payments WHERE user_id = " + userId;

   Fix:
   @Query("SELECT p FROM Payment p WHERE p.userId = :userId")
   List<Payment> findByUserId(@Param("userId") Long userId);

   Impact: Attacker can extract entire database

2. Missing Authorization - Line 67
   Severity: CRITICAL
   Risk: Unauthorized access to payment data

   Issue:
   @GetMapping("/{id}")
   public Payment getPayment(@PathVariable Long id) {
       return paymentService.getPayment(id);
   }

   Fix:
   @PreAuthorize("hasPermission(#id, 'Payment', 'READ')")

   Impact: Any authenticated user can view any payment

High Risk Issues (3):

1. Sensitive Data Exposure - Line 89
   Severity: HIGH
   Issue: Credit card number logged in plain text
   Fix: Mask or omit sensitive data from logs

2. Missing Rate Limiting - Controller Level
   Severity: HIGH
   Issue: No rate limiting on payment endpoints
   Fix: Add @RateLimit annotation

3. Weak Password Policy - Line 123
   Severity: HIGH
   Issue: No minimum password requirements
   Fix: Implement strong password policy

Medium Risk Issues (4):
- Missing CSRF protection
- No request size limits
- Verbose error messages
- Missing security headers

Recommendations:
1. Implement security headers (X-Frame-Options, CSP, etc.)
2. Add comprehensive input validation
3. Enable security logging and monitoring
4. Conduct regular security audits
5. Implement Web Application Firewall (WAF)
```

## Compliance Checks
- PCI DSS (for payment data)
- GDPR (for personal data)
- SOC 2
- ISO 27001

## Integration
Uses OWASP Dependency Check results and static analysis tools.
