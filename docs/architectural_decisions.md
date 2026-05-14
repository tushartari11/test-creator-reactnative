# Architectural Decision Records (ADR)

## ADR-001: Technology Stack Selection

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to select technology stack for online test creator application with high performance requirements (100K-1M QPS).

### Decision

- **Backend**: Spring Boot 3.x with Java 21
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Frontend**: Vanilla JavaScript (ES6+)
- **Deployment**: Kubernetes on AWS

### Rationale

1. **Spring Boot**:
   - Team has 18 years of Java/Spring experience
   - Excellent performance and scalability
   - Rich ecosystem of libraries
   - Production-ready features (Actuator, Security)
   - Easy integration with PostgreSQL and Redis

2. **PostgreSQL**:
   - ACID compliant for critical test data
   - Excellent JSON support for flexible data
   - Strong performance with proper indexing
   - Read replica support for scaling
   - Mature and well-documented

3. **Redis**:
   - Sub-millisecond latency for caching
   - Session management across instances
   - Pub/Sub for real-time features
   - High throughput (100K+ ops/sec)

4. **Vanilla JavaScript**:
   - No build process overhead
   - Faster initial development
   - Easy to upgrade to React/Vue later
   - Better performance for simple UI
   - Easier debugging

### Consequences

- **Positive**:
  - Leverages existing expertise
  - Fast development cycle
  - Proven scalability
  - Easy to hire developers
- **Negative**:
  - Frontend may need refactoring for complex features
  - Manual DOM manipulation for dynamic UI

### Alternatives Considered

1. **Quarkus + React**: More modern but less mature ecosystem
2. **Node.js + MongoDB**: Good performance but team has less expertise
3. **Django + Vue.js**: Python ecosystem but team is Java-focused

---

## ADR-002: Database Read/Write Splitting

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to handle 100K-1M QPS with PostgreSQL.

### Decision

Implement read/write splitting with one primary database and multiple read replicas.

### Rationale

1. Most database operations are reads (90%+)
2. Read replicas can scale horizontally
3. Reduces load on primary database
4. Improves overall throughput
5. PostgreSQL has built-in replication support

### Implementation

- Primary: All write operations
- Read Replicas: All read operations (using @ReadOnly annotation)
- Custom routing data source to direct queries

### Consequences

- **Positive**:
  - Massive read scalability
  - Better resource utilization
  - Can add replicas without code changes
- **Negative**:
  - Replication lag (eventual consistency)
  - More infrastructure to manage
  - Slightly more complex configuration

---

## ADR-003: JWT-based Authentication

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need stateless authentication for horizontal scaling.

### Decision

Use JWT (JSON Web Tokens) for authentication with refresh token mechanism.

### Rationale

1. Stateless - no server-side session storage needed
2. Enables horizontal scaling
3. Token contains user role for authorization
4. Industry standard approach
5. Works well with microservices architecture

### Implementation

- Access token: 24-hour expiration
- Refresh token: 7-day expiration
- Tokens stored in Redis blacklist on logout
- BCrypt for password hashing (cost factor: 12)

### Consequences

- **Positive**:
  - Truly stateless authentication
  - Easy to scale horizontally
  - Works across different domains
- **Negative**:
  - Cannot revoke tokens immediately (use blacklist)
  - Larger HTTP headers
  - Token refresh complexity

### Alternatives Considered

1. **Session-based**: Requires sticky sessions or shared storage
2. **OAuth2**: Overkill for internal application
3. **SAML**: Too complex for MVP

---

## ADR-004: Proctoring Implementation Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to prevent cheating during online exams with specific requirements:

- Single monitor enforcement
- Full-screen mode
- Tab/window switch prevention
- Keyboard shortcut blocking

### Decision

Implement browser-based proctoring using:

- Screen Capture API for monitor detection
- Fullscreen API for full-screen enforcement
- Visibility API for tab switch detection
- Keyboard event blocking for shortcuts

### Rationale

1. Browser APIs are mature and well-supported
2. No additional software installation required
3. Works across platforms (Windows, Mac, Linux)
4. Real-time violation tracking
5. Cost-effective (no third-party service)

### Implementation Details

- Monitor check before test starts
- Continuous monitoring during test
- Violation logging to database
- Automatic test submission on critical violations

### Limitations

- Cannot detect physical second screen if user mirrors display
- Advanced users may bypass with browser extensions
- Requires modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Consequences

- **Positive**:
  - No additional infrastructure cost
  - Works in all modern browsers
  - Real-time violation detection
  - Audit trail for violations
- **Negative**:
  - Can be bypassed by sophisticated users
  - Requires JavaScript enabled
  - May have false positives

### Future Enhancements

- Webcam monitoring
- AI-based behavior analysis
- Eye tracking
- Audio monitoring

---

## ADR-005: Caching Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to minimize database load and improve response times for 100K-1M QPS.

### Decision

Implement multi-level caching strategy:

1. Redis for distributed cache
2. Spring Cache abstraction for application-level caching
3. Browser caching for static assets

### Caching Rules

- **Tests**: Cache for 2 hours (read-heavy, rarely change)
- **Questions**: Cache for 4 hours (static once published)
- **User profiles**: Cache for 30 minutes (may change)
- **Test results**: Cache for 1 hour (static after evaluation)
- **Don't cache**: Active test attempts, real-time violations

### Cache Invalidation

- On update: Evict specific cache entry
- On delete: Evict related cache entries
- Periodic: Flush old cache entries

### Consequences

- **Positive**:
  - Massive reduction in database load
  - Sub-millisecond response times
  - Horizontal scalability
- **Negative**:
  - Cache inconsistency during updates
  - Additional memory requirements
  - Cache warming overhead

---

## ADR-006: API Design - RESTful vs GraphQL

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to design API for test creator application.

### Decision

Use RESTful API design.

### Rationale

1. Team expertise with REST
2. Simpler to implement and test
3. Better caching support
4. Standard HTTP methods
5. Easier to monitor and debug

### API Design Principles

- Resource-based URLs
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON for request/response
- Consistent error responses
- Versioning in URL (/api/v1)

### Consequences

- **Positive**:
  - Well-understood paradigm
  - Excellent tooling support
  - HTTP caching works out-of-box
- **Negative**:
  - Over-fetching/under-fetching data
  - Multiple round trips for complex data

### Alternatives Considered

- **GraphQL**: More flexible but adds complexity
- **gRPC**: Better performance but less tooling support

---

## ADR-007: Database Indexing Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to optimize database queries for high performance.

### Decision

Create strategic indexes based on query patterns:

**Primary Indexes:**

- User email (unique, frequently queried)
- Test status (filter by status)
- Test date (sorting)
- Attempt test_id + student_id (unique constraint)

**Composite Indexes:**

- tests(created_by_id, status)
- test_attempts(student_id, submitted_at DESC)

**Partial Indexes:**

- tests(status) WHERE status = 'PUBLISHED'

### Consequences

- **Positive**:
  - Fast query performance
  - Reduced database load
  - Better query plan selection
- **Negative**:
  - Slower writes
  - More storage space
  - Index maintenance overhead

---

## ADR-008: Error Handling Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need consistent error handling across application.

### Decision

Implement centralized error handling with:

- Global exception handler
- Standard error response format
- Appropriate HTTP status codes
- Detailed logging

### Error Response Format

```json
{
  "timestamp": "2026-02-11T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/tests",
  "errors": [...]
}
```

### Error Categories

- Validation errors: 400 Bad Request
- Authentication errors: 401 Unauthorized
- Authorization errors: 403 Forbidden
- Not found: 404 Not Found
- Business logic: 409 Conflict
- Server errors: 500 Internal Server Error

### Consequences

- **Positive**:
  - Consistent error responses
  - Easier debugging
  - Better client experience
- **Negative**:
  - More boilerplate code
  - Careful not to expose sensitive info

---

## ADR-009: Test Data Management

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to handle test questions and options efficiently.

### Decision

Use JPA entity relationships with cascade operations:

- Test → Questions (One-to-Many, CASCADE ALL)
- Question → Options (One-to-Many, CASCADE ALL)
- Test → Attempts (One-to-Many, CASCADE on delete)

### Rationale

1. Automatic deletion of related entities
2. Simplified code
3. Data integrity maintained
4. Transactional consistency

### Fetch Strategy

- Lazy loading by default
- Eager loading with JOIN FETCH for read operations
- DTO projections for list views

### Consequences

- **Positive**:
  - Cleaner code
  - Data integrity
  - Transactional safety
- **Negative**:
  - N+1 query problem if not careful
  - Lazy loading exceptions
  - Larger object graphs in memory

---

## ADR-010: Deployment Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to deploy application to handle 100K-1M QPS.

### Decision

Deploy on Kubernetes (AWS EKS) with:

- Auto-scaling (3-100 pods)
- Multi-AZ deployment
- Blue-green deployments
- Rolling updates

### Infrastructure Components

- **Load Balancer**: AWS ALB with WAF
- **Application**: Spring Boot in Docker containers
- **Database**: RDS PostgreSQL Multi-AZ
- **Cache**: ElastiCache Redis cluster
- **CDN**: CloudFront for static assets

### Scaling Triggers

- CPU utilization > 70%
- Memory utilization > 80%
- Request rate per pod
- Response time degradation

### Consequences

- **Positive**:
  - Automatic scaling
  - High availability
  - Zero-downtime deployments
  - Resource efficiency
- **Negative**:
  - Higher infrastructure cost
  - More operational complexity
  - Requires Kubernetes expertise

---

## ADR-011: Logging and Monitoring

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need observability for high-traffic application.

### Decision

Implement comprehensive logging and monitoring:

**Logging:**

- SLF4J + Logback for application logs
- Structured logging (JSON format)
- Log aggregation via ELK stack
- Log levels: ERROR, WARN, INFO, DEBUG

**Monitoring:**

- Spring Boot Actuator for health checks
- Micrometer + Prometheus for metrics
- Grafana for dashboards
- New Relic/Datadog for APM

**Key Metrics:**

- Request rate (QPS)
- Response time (p50, p95, p99)
- Error rate
- Database query time
- Cache hit rate
- JVM metrics (heap, GC)

### Alert Rules

- Response time p95 > 500ms
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 90%
- Database connection pool exhausted

### Consequences

- **Positive**:
  - Early problem detection
  - Performance insights
  - Troubleshooting capability
- **Negative**:
  - Additional infrastructure cost
  - Log storage costs
  - Alert fatigue if not tuned

---

## ADR-012: Security Implementation

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need to secure application handling sensitive test data.

### Decision

Implement defense-in-depth security:

**Application Layer:**

- Spring Security for authentication/authorization
- JWT with short expiration
- BCrypt password hashing (cost 12)
- Input validation (Hibernate Validator)
- XSS prevention (escaping)
- CSRF protection for state-changing operations

**Network Layer:**

- HTTPS/TLS 1.3 only
- CORS configuration
- Rate limiting per user/IP
- WAF (AWS WAF)

**Database Layer:**

- JPA/Hibernate (parameterized queries)
- Database user with minimal permissions
- Encrypted backups
- Connection pooling with SSL

**Proctoring Security:**

- Tab switch monitoring
- Full-screen enforcement
- Keyboard blocking
- Violation logging

### Consequences

- **Positive**:
  - Multiple layers of protection
  - Industry best practices
  - Audit trail
- **Negative**:
  - Performance overhead
  - User experience friction
  - More complexity

---

## ADR-013: Testing Strategy

**Date**: 2026-02-11  
**Status**: Accepted  
**Context**: Need comprehensive testing for production-ready application.

### Decision

Implement test pyramid:

- **Unit Tests**: 80% coverage (JUnit 5, Mockito)
- **Integration Tests**: 15% (Spring Boot Test)
- **E2E Tests**: 5% (Selenium/Playwright)

### Testing Tools

- JUnit 5 for unit tests
- Mockito for mocking
- Testcontainers for integration tests
- K6 for load testing
- SonarQube for code quality

### CI/CD Pipeline

1. Run unit tests on every commit
2. Run integration tests on PR
3. Run load tests weekly
4. Automated deployment on main branch

### Consequences

- **Positive**:
  - High confidence in changes
  - Catch bugs early
  - Automated quality gates
- **Negative**:
  - Longer build times
  - More test maintenance
  - Infrastructure for test environments

---

## Future ADRs to Consider

- ADR-014: Microservices vs Monolith (if scaling beyond MVP)
- ADR-015: Real-time Communication (WebSocket for live proctoring)
- ADR-016: Multi-tenancy Strategy (for white-label solution)
- ADR-017: Data Retention and Archival Policy
- ADR-018: Disaster Recovery and Backup Strategy
- ADR-019: A/B Testing Framework
- ADR-020: Feature Flagging System

---

**Document Maintenance**: These ADRs should be reviewed quarterly and updated as needed. Deprecated decisions should be marked as "Superseded" with reference to the new ADR.

**Last Updated**: February 11, 2026
