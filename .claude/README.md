# Online Test Creator - Claude AI Assistant Guide

## About This Project
A high-performance Spring Boot application for creating and administering online examinations with advanced proctoring capabilities. Designed to handle 100,000 - 1,000,000 queries per second (QPS) with role-based access control for Teachers and Students.

## Project Goals
- **High Performance**: 100K-1M QPS throughput
- **Secure Testing**: Browser-based proctoring (single monitor, full-screen, tab switching prevention)
- **Scalability**: Horizontal scaling via Kubernetes with auto-scaling
- **Data Integrity**: PostgreSQL with read/write splitting + Redis caching
- **Rich Features**: Test creation, student test-taking, automated grading, analytics

## Available Agents

### Code Reviewer Agent
Reviews code for quality, best practices, and potential issues.
- Checks coding standards (Google Java Style Guide)
- Identifies security vulnerabilities
- Suggests performance improvements
- Validates architectural patterns

### Explainer Agent
Explains code functionality in simple terms with diagrams and analogies.
- Breaks down complex Spring Boot concepts
- Explains caching strategies
- Clarifies database optimization techniques

### Security Pen Tester Agent
Performs security analysis and identifies vulnerabilities.
- OWASP Top 10 checks
- JWT authentication/authorization review
- Input validation review
- SQL injection prevention
- Proctoring security analysis

## Available Skills

### Explain Code
Provides detailed explanations of code segments with:
- Purpose and functionality
- Design patterns used (Repository, DTO, Service Layer)
- Dependencies and interactions
- Performance implications
- Potential improvements

## Working with Claude

### Common Tasks

#### Feature Development
1. **Create authentication**: "Implement JWT-based authentication with refresh tokens"
2. **Create test management**: "Create REST API for teachers to manage tests"
3. **Implement proctoring**: "Add browser-based proctoring with tab switch detection"
4. **Add caching**: "Implement Redis caching for test queries"

#### Code Quality
1. **Review code**: "Review TestService for best practices and optimization"
2. **Fix bugs**: "Fix N+1 query issue in TestRepository"
3. **Optimize**: "Optimize database queries in test retrieval"
4. **Security check**: "Check for security vulnerabilities in student test-taking flow"

#### Understanding
1. **Explain architecture**: "Explain how read/write database splitting works"
2. **Explain proctoring**: "Explain the browser proctoring system"
3. **Explain caching**: "Explain the caching strategy and TTL configuration"

### Best Practices
- Be specific about what you want
- Provide context when asking questions (e.g., "for high QPS environment")
- Reference architectural patterns from documentation
- Ask about performance implications for high-traffic scenarios
- Review changes before committing
- Test thoroughly with load testing tools (K6, JMeter)

## Architecture Overview

### High-Level Components
```
┌─────────────────────────────────────┐
│  Load Balancer (ALB + WAF)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Spring Boot Instances (3-100 pods) │
│  - Stateless design                 │
│  - Auto-scaling                     │
└─────────┬─────────────┬─────────────┘
          │             │
┌─────────▼─────┐  ┌───▼────────────┐
│  PostgreSQL   │  │  Redis Cache   │
│  Primary +    │  │  Session Store │
│  Replicas     │  │                │
└───────────────┘  └────────────────┘
```

### Key Patterns
- **Read/Write Splitting**: Primary for writes, replicas for reads
- **Multi-layer Caching**: Redis for distributed cache, browser for static assets
- **DTO Pattern**: Never expose entities directly via API
- **JWT Auth**: Stateless authentication with 24h tokens
- **Proctoring**: Browser-based security enforcement

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| Throughput | 100K-1M QPS | K6 load testing |
| Response Time (p95) | < 200ms | Prometheus |
| Database Query (p95) | < 50ms | Slow query log |
| Cache Hit Rate | > 80% | Redis metrics |
| Availability | 99.9% | Uptime monitoring |

## Development Phases

### Phase 0: Documentation & Setup ✅
- ✅ Technical specifications
- ✅ API design
- ✅ Database schema
- ✅ Architecture decisions

### Phase 1: MVP (In Progress)
- [ ] Spring Boot project setup
- [ ] User authentication (JWT)
- [ ] Test CRUD operations (Teacher)
- [ ] Test-taking flow (Student)
- [ ] Basic result viewing

### Phase 2: Proctoring
- [ ] Single monitor detection
- [ ] Full-screen enforcement
- [ ] Tab switch prevention
- [ ] Keyboard blocking
- [ ] Violation logging

### Phase 3: Performance Optimization
- [ ] Read/write DB splitting
- [ ] Redis caching implementation
- [ ] Connection pool tuning
- [ ] Query optimization
- [ ] API rate limiting

### Phase 4: Scalability & HA
- [ ] Kubernetes deployment (AWS EKS)
- [ ] Auto-scaling configuration
- [ ] Monitoring setup (Prometheus + Grafana)
- [ ] Multi-AZ database setup

### Phase 5: Advanced Features
- [ ] Question bank
- [ ] Test analytics
- [ ] Bulk question upload
- [ ] Email notifications
- [ ] Advanced reporting

## Project Status

**Current Phase**: Phase 0 (Documentation complete, ready for implementation)

**Tech Stack Ready**:
- Spring Boot 3.2.x
- Java 21
- PostgreSQL 15+
- Redis 7.x
- Maven 3.9.x

**Next Milestone**: Complete Phase 1 MVP

## Key Documentation Files

- **`CLAUDE.md`**: Main AI assistant guide with code examples
- **`TECHNICAL_DOCUMENTATION.md`**: Detailed technical specifications (2400+ lines)
- **`API_REFERENCE.md`**: Complete REST API documentation
- **`ARCHITECTURAL_DECISIONS.md`**: ADRs for all major decisions
- **`PROJECT_SETUP.md`**: Environment setup and installation guide
- **`database-schema.sql`**: Complete database DDL
- **`.claude/coding-guidelines.md`**: Coding standards and patterns

## Getting Started

1. **Read Architecture**: Review `CLAUDE.md` for architectural patterns
2. **Understand API**: Check `API_REFERENCE.md` for endpoint specs
3. **Setup Environment**: Follow `PROJECT_SETUP.md` for local dev setup
4. **Review Decisions**: Read `ARCHITECTURAL_DECISIONS.md` for context
5. **Start Coding**: Follow patterns in `.claude/coding-guidelines.md`

## Important Considerations

### Performance
- Always consider QPS impact of changes
- Use caching strategically (see cache TTLs in docs)
- Optimize database queries (use JOIN FETCH, DTO projections)
- Avoid N+1 queries

### Security
- JWT tokens with 24h expiration
- BCrypt password hashing (cost factor 12)
- Role-based access control (TEACHER/STUDENT)
- Input validation on all endpoints
- Proctoring system for exam integrity

### Scalability
- Stateless application design
- Horizontal scaling ready
- Read/write database splitting
- Redis for distributed caching
- Connection pooling optimized

## Support

For detailed implementation guidance, refer to:
- `CLAUDE.md` - Comprehensive guide with code examples
- `.claude/coding-guidelines.md` - Coding standards
- `TECHNICAL_DOCUMENTATION.md` - Complete technical specs
- `API_REFERENCE.md` - API endpoint reference
