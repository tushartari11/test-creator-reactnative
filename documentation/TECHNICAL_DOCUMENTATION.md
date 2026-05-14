# Online Test Creator Application - Technical Documentation

## Executive Summary

A high-performance, secure online examination platform with role-based access (Teacher/Student), built using Spring Boot 3.x with stringent security controls for preventing cheating during examinations.

### Key Performance Requirements (NFRs)
- **Throughput**: 100,000 - 1,000,000 QPS/TPS
- **Security**: Single monitor enforcement, full-screen mode, keyboard/tab switching prevention
- **Scalability**: Horizontal scaling capability
- **Availability**: 99.9% uptime SLA

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Phase-wise Implementation](#phase-wise-implementation)
4. [Data Model](#data-model)
5. [API Specifications](#api-specifications)
6. [Security & Proctoring Features](#security--proctoring-features)
7. [Performance & Scalability](#performance--scalability)
8. [Deployment Architecture](#deployment-architecture)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (ALB)                       │
│                    (SSL Termination, WAF)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                      │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│   Spring Boot     │                 │   Spring Boot     │
│   Instance 1      │◄───────────────►│   Instance N      │
│   (Stateless)     │   Session Sync  │   (Stateless)     │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                      │
          └──────────────────┬───────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                      │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│   Redis Cluster   │                 │  PostgreSQL       │
│   (Session,       │                 │  (Primary +       │
│    Cache)         │                 │   Read Replicas)  │
└───────────────────┘                 └───────────────────┘
          │                                      │
          │                                      │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│  Elasticsearch    │                 │   S3 / CloudFront │
│  (Search, Logs)   │                 │   (Static Assets) │
└───────────────────┘                 └───────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Teacher UI   │  │ Student UI   │  │  Admin UI    │     │
│  │ (Vanilla JS) │  │ (Vanilla JS) │  │ (Vanilla JS) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST API (JSON)
┌─────────────────────────────▼───────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Filter Chain                                │  │
│  │  - JWT Authentication                                 │  │
│  │  - CSRF Protection                                    │  │
│  │  - Rate Limiting (per user/IP)                       │  │
│  │  - Request Validation                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │ Test Service │  │Result Service│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Proctoring    │  │Analytics     │  │Notification  │     │
│  │Service       │  │Service       │  │Service       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                   Data Access Layer (JPA)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Repository Pattern + Custom Queries                  │  │
│  │  - Optimized batch operations                         │  │
│  │  - Connection pooling (HikariCP)                     │  │
│  │  - Read/Write splitting                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │    Redis     │  │Elasticsearch │     │
│  │ (RDBMS)      │  │   (Cache)    │  │   (Search)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Spring Boot | 3.2.x | Core application framework |
| Language | Java | 17+ (LTS) | Primary language |
| Database | PostgreSQL | 15+ | Primary data store |
| Cache | Redis | 7.x | Session storage, caching |
| Search | Elasticsearch | 8.x | Full-text search, analytics |
| Security | Spring Security | 6.x | Authentication, authorization |
| API Documentation | SpringDoc OpenAPI | 2.x | API documentation |
| Validation | Hibernate Validator | 8.x | Input validation |
| Monitoring | Micrometer + Prometheus | Latest | Metrics collection |
| Logging | SLF4J + Logback | Latest | Application logging |

### Frontend Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Core | Vanilla JavaScript (ES6+) | UI interactions |
| Styling | CSS3 (Grid, Flexbox) | Layouts and styling |
| Icons | Font Awesome / Lucide | UI icons |
| Charts | Chart.js | Analytics dashboard |

### DevOps & Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containerization | Docker | Application packaging |
| Orchestration | Kubernetes (EKS) | Container orchestration |
| CI/CD | GitHub Actions / Jenkins | Deployment pipeline |
| Cloud Provider | AWS | Infrastructure |
| CDN | CloudFront | Static asset delivery |
| Monitoring | Grafana + Prometheus | Observability |
| APM | New Relic / Datadog | Performance monitoring |
| Load Balancer | AWS ALB | Traffic distribution |

### Build Tools
- **Maven** 3.9.x - Dependency management
- **JaCoCo** - Code coverage
- **SonarQube** - Code quality analysis

---

## Phase-wise Implementation

## Phase 0: Project Setup & Foundation (Week 1)

### Objectives
- Initialize Spring Boot project
- Setup development environment
- Configure base infrastructure
- Establish coding standards

### Deliverables
1. **Spring Boot Application Structure**
   ```
   test-creator/
   ├── src/main/java/com/testcreator/
   │   ├── config/          # Configuration classes
   │   ├── controller/      # REST controllers
   │   ├── service/         # Business logic
   │   ├── repository/      # Data access
   │   ├── model/           # Domain entities
   │   ├── dto/             # Data transfer objects
   │   ├── exception/       # Custom exceptions
   │   ├── security/        # Security components
   │   └── util/            # Utility classes
   ├── src/main/resources/
   │   ├── static/          # Frontend assets
   │   ├── db/migration/    # Flyway migrations
   │   ├── application.yml  # Configuration
   │   └── application-{env}.yml
   └── src/test/java/       # Test cases
   ```

2. **Maven Dependencies (pom.xml)**
   ```xml
   <dependencies>
       <!-- Spring Boot Starters -->
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-web</artifactId>
       </dependency>
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-data-jpa</artifactId>
       </dependency>
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-security</artifactId>
       </dependency>
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-validation</artifactId>
       </dependency>
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-cache</artifactId>
       </dependency>
       
       <!-- Database -->
       <dependency>
           <groupId>org.postgresql</groupId>
           <artifactId>postgresql</artifactId>
       </dependency>
       <dependency>
           <groupId>com.h2database</groupId>
           <artifactId>h2</artifactId>
           <scope>test</scope>
       </dependency>
       
       <!-- Redis -->
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-data-redis</artifactId>
       </dependency>
       
       <!-- JWT -->
       <dependency>
           <groupId>io.jsonwebtoken</groupId>
           <artifactId>jjwt-api</artifactId>
           <version>0.12.3</version>
       </dependency>
       <dependency>
           <groupId>io.jsonwebtoken</groupId>
           <artifactId>jjwt-impl</artifactId>
           <version>0.12.3</version>
       </dependency>
       
       <!-- Lombok -->
       <dependency>
           <groupId>org.projectlombok</groupId>
           <artifactId>lombok</artifactId>
       </dependency>
       
       <!-- Monitoring -->
       <dependency>
           <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-actuator</artifactId>
       </dependency>
       <dependency>
           <groupId>io.micrometer</groupId>
           <artifactId>micrometer-registry-prometheus</artifactId>
       </dependency>
   </dependencies>
   ```

3. **Application Configuration**
   ```yaml
   # application.yml
   server:
     port: 8080
     compression:
       enabled: true
     http2:
       enabled: true
   
   spring:
     application:
       name: test-creator
     
     datasource:
       url: jdbc:postgresql://localhost:5432/testcreator
       username: ${DB_USERNAME}
       password: ${DB_PASSWORD}
       hikari:
         maximum-pool-size: 20
         minimum-idle: 5
         connection-timeout: 30000
         idle-timeout: 600000
         max-lifetime: 1800000
     
     jpa:
       hibernate:
         ddl-auto: validate
       properties:
         hibernate:
           dialect: org.hibernate.dialect.PostgreSQLDialect
           format_sql: true
           jdbc:
             batch_size: 50
           order_inserts: true
           order_updates: true
     
     redis:
       host: localhost
       port: 6379
       timeout: 2000
       lettuce:
         pool:
           max-active: 20
           max-idle: 10
           min-idle: 5
     
     cache:
       type: redis
       redis:
         time-to-live: 3600000
   
   management:
     endpoints:
       web:
         exposure:
           include: health,metrics,prometheus,info
     metrics:
       export:
         prometheus:
           enabled: true
   
   jwt:
     secret: ${JWT_SECRET}
     expiration: 86400000  # 24 hours
     refresh-expiration: 604800000  # 7 days
   
   exam:
     proctoring:
       enabled: true
       max-tab-switches: 0
       monitor-check-interval: 5000  # 5 seconds
   ```

### Tasks
- [ ] Create Spring Boot project with Maven
- [ ] Setup PostgreSQL database
- [ ] Configure Redis for caching
- [ ] Setup Docker Compose for local development
- [ ] Create base entity classes
- [ ] Setup logging framework
- [ ] Configure Spring Security basics
- [ ] Setup API documentation (SpringDoc)

---

## Phase 1: MVP - Core Functionality (Week 2-3)

### Objectives
- Implement authentication and authorization
- Create basic CRUD operations for tests
- Implement student test-taking flow
- Basic result viewing

### 1.1 User Authentication & Authorization

#### Entities
```java
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;  // TEACHER, STUDENT
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}

public enum Role {
    TEACHER,
    STUDENT
}
```

#### REST Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### 1.2 Test Management (Teacher)

#### Entities
```java
@Entity
@Table(name = "tests")
@Data
public class Test {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @Column(nullable = false)
    private Integer totalQuestions;
    
    @Column(nullable = false)
    private Integer passingScore;
    
    @Column(nullable = false)
    private Integer durationMinutes;
    
    @Column(nullable = false)
    private LocalDateTime testDate;
    
    @Enumerated(EnumType.STRING)
    private TestStatus status;  // DRAFT, PUBLISHED, ARCHIVED
    
    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL)
    private List<Question> questions = new ArrayList<>();
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}

@Entity
@Table(name = "questions")
@Data
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private Test test;
    
    @Column(nullable = false)
    private Integer questionNumber;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;
    
    private String explanation;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    @OrderBy("optionNumber ASC")
    private List<Option> options = new ArrayList<>();
    
    @Column(nullable = false)
    private Integer correctOptionNumber;
}

@Entity
@Table(name = "options")
@Data
public class Option {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(nullable = false)
    private Integer optionNumber;  // 1, 2, 3, 4
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionText;
}

public enum TestStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
}
```

#### REST Endpoints
- `POST /api/tests` - Create new test
- `GET /api/tests` - Get all tests (paginated)
- `GET /api/tests/{id}` - Get test by ID
- `PUT /api/tests/{id}` - Update test
- `DELETE /api/tests/{id}` - Delete test
- `POST /api/tests/{id}/publish` - Publish test
- `GET /api/tests/{id}/questions` - Get all questions for a test

### 1.3 Test Taking (Student)

#### Entities
```java
@Entity
@Table(name = "test_attempts")
@Data
public class TestAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private Test test;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private User student;
    
    @Column(nullable = false)
    private LocalDateTime startedAt;
    
    private LocalDateTime submittedAt;
    
    @Column(nullable = false)
    private Integer score = 0;
    
    @Column(nullable = false)
    private Integer correctAnswers = 0;
    
    @Column(nullable = false)
    private Integer wrongAnswers = 0;
    
    @Enumerated(EnumType.STRING)
    private AttemptStatus status;  // IN_PROGRESS, SUBMITTED, EVALUATED
    
    @Enumerated(EnumType.STRING)
    private ResultStatus result;  // PASS, FAIL
    
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL)
    private List<StudentAnswer> answers = new ArrayList<>();
    
    // Proctoring fields
    private Integer tabSwitchCount = 0;
    private Boolean monitorCheckPassed = true;
    private String browserInfo;
    private String ipAddress;
}

@Entity
@Table(name = "student_answers")
@Data
public class StudentAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private TestAttempt attempt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(nullable = false)
    private Integer selectedOption;
    
    @Column(nullable = false)
    private Boolean isCorrect;
    
    private LocalDateTime answeredAt;
}

public enum AttemptStatus {
    IN_PROGRESS,
    SUBMITTED,
    EVALUATED
}

public enum ResultStatus {
    PASS,
    FAIL
}
```

#### REST Endpoints
- `GET /api/student/tests/available` - Get available tests
- `POST /api/student/tests/{testId}/start` - Start test attempt
- `GET /api/student/attempts/{attemptId}` - Get current attempt
- `POST /api/student/attempts/{attemptId}/answer` - Submit answer
- `POST /api/student/attempts/{attemptId}/submit` - Submit entire test
- `GET /api/student/attempts/{attemptId}/result` - Get test result

### 1.4 Results Management

#### REST Endpoints (Teacher)
- `GET /api/results/tests` - Get list of tests with results
- `GET /api/results/tests/{testId}` - Get all results for a test
- `GET /api/results/tests/{testId}/export` - Export results as CSV

#### REST Endpoints (Student)
- `GET /api/student/results` - Get my test results
- `GET /api/student/results/{attemptId}` - Get detailed result

### Deliverables
- [ ] Complete authentication system with JWT
- [ ] Test CRUD operations (Teacher)
- [ ] Question and option management
- [ ] Test-taking flow (Student)
- [ ] Result calculation and storage
- [ ] Basic result viewing

---

## Phase 2: Security & Proctoring Features (Week 4)

### Objectives
- Implement monitor detection
- Full-screen enforcement
- Tab/window switch prevention
- Keyboard shortcut blocking

### 2.1 Browser-based Proctoring

#### Frontend Security Features

```javascript
// Monitor Detection API
class MonitorDetector {
    constructor() {
        this.monitorCount = 1;
    }
    
    async detectMonitors() {
        try {
            // Screen Capture API to detect multiple displays
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "monitor" }
            });
            
            // Get screen information
            if (window.screen && window.screen.isExtended) {
                this.monitorCount = window.screen.isExtended ? 2 : 1;
            }
            
            // Stop the stream immediately
            stream.getTracks().forEach(track => track.stop());
            
            return this.monitorCount;
        } catch (error) {
            console.error('Monitor detection failed:', error);
            return 1;
        }
    }
    
    async checkSecondaryMonitor() {
        const monitors = await this.detectMonitors();
        return monitors > 1;
    }
}

// Full Screen Manager
class FullScreenManager {
    constructor(element) {
        this.element = element || document.documentElement;
        this.isFullScreen = false;
    }
    
    async requestFullScreen() {
        try {
            if (this.element.requestFullscreen) {
                await this.element.requestFullscreen();
            } else if (this.element.webkitRequestFullscreen) {
                await this.element.webkitRequestFullscreen();
            } else if (this.element.mozRequestFullScreen) {
                await this.element.mozRequestFullScreen();
            } else if (this.element.msRequestFullscreen) {
                await this.element.msRequestFullscreen();
            }
            this.isFullScreen = true;
        } catch (error) {
            throw new Error('Failed to enter fullscreen mode');
        }
    }
    
    exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        this.isFullScreen = false;
    }
    
    onFullScreenChange(callback) {
        document.addEventListener('fullscreenchange', callback);
        document.addEventListener('webkitfullscreenchange', callback);
        document.addEventListener('mozfullscreenchange', callback);
        document.addEventListener('MSFullscreenChange', callback);
    }
}

// Tab/Window Switch Detector
class TabSwitchDetector {
    constructor(onSwitch) {
        this.switchCount = 0;
        this.onSwitch = onSwitch;
        this.setupListeners();
    }
    
    setupListeners() {
        // Visibility API
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.switchCount++;
                this.onSwitch(this.switchCount);
            }
        });
        
        // Focus events
        window.addEventListener('blur', () => {
            this.switchCount++;
            this.onSwitch(this.switchCount);
        });
        
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }
    
    getSwitchCount() {
        return this.switchCount;
    }
}

// Keyboard Blocker
class KeyboardBlocker {
    constructor() {
        this.blockedKeys = [
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'Escape', 'PrintScreen'
        ];
        this.blockedCombinations = [
            { ctrl: true, key: 'c' },
            { ctrl: true, key: 'v' },
            { ctrl: true, key: 'x' },
            { ctrl: true, key: 'a' },
            { ctrl: true, key: 'p' },
            { ctrl: true, key: 's' },
            { ctrl: true, key: 't' },
            { ctrl: true, key: 'w' },
            { ctrl: true, key: 'n' },
            { ctrl: true, shift: true, key: 'i' }, // DevTools
            { alt: true, key: 'Tab' },
            { alt: true, key: 'F4' },
            { meta: true, key: 'Tab' }
        ];
        this.setupListeners();
    }
    
    setupListeners() {
        document.addEventListener('keydown', (e) => {
            // Block function keys and special keys
            if (this.blockedKeys.includes(e.key)) {
                e.preventDefault();
                return false;
            }
            
            // Block key combinations
            for (let combo of this.blockedCombinations) {
                let match = true;
                if (combo.ctrl && !e.ctrlKey) match = false;
                if (combo.alt && !e.altKey) match = false;
                if (combo.shift && !e.shiftKey) match = false;
                if (combo.meta && !e.metaKey) match = false;
                if (combo.key && e.key.toLowerCase() !== combo.key.toLowerCase()) match = false;
                
                if (match) {
                    e.preventDefault();
                    return false;
                }
            }
        });
    }
}

// Exam Proctoring System
class ExamProctorSystem {
    constructor(config) {
        this.config = config;
        this.monitorDetector = new MonitorDetector();
        this.fullScreenManager = new FullScreenManager();
        this.tabSwitchDetector = null;
        this.keyboardBlocker = null;
        this.violations = [];
    }
    
    async initialize() {
        // Check for multiple monitors
        const hasMultipleMonitors = await this.monitorDetector.checkSecondaryMonitor();
        if (hasMultipleMonitors) {
            throw new Error('Multiple monitors detected. Please disconnect secondary monitors.');
        }
        
        // Enter fullscreen
        await this.fullScreenManager.requestFullScreen();
        
        // Setup tab switch detection
        this.tabSwitchDetector = new TabSwitchDetector((count) => {
            this.violations.push({
                type: 'TAB_SWITCH',
                count: count,
                timestamp: new Date().toISOString()
            });
            
            if (count > this.config.maxTabSwitches) {
                this.handleViolation('Excessive tab switching detected');
            }
        });
        
        // Setup keyboard blocking
        this.keyboardBlocker = new KeyboardBlocker();
        
        // Monitor fullscreen changes
        this.fullScreenManager.onFullScreenChange(() => {
            if (!document.fullscreenElement) {
                this.handleViolation('Exited fullscreen mode');
            }
        });
        
        // Send periodic heartbeat
        this.startHeartbeat();
    }
    
    handleViolation(message) {
        console.warn('Proctoring violation:', message);
        // Send to backend
        this.reportViolation(message);
    }
    
    async reportViolation(message) {
        await fetch('/api/student/attempts/violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attemptId: this.config.attemptId,
                violation: message,
                timestamp: new Date().toISOString()
            })
        });
    }
    
    startHeartbeat() {
        setInterval(() => {
            fetch('/api/student/attempts/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId: this.config.attemptId,
                    tabSwitches: this.tabSwitchDetector.getSwitchCount(),
                    timestamp: new Date().toISOString()
                })
            });
        }, this.config.heartbeatInterval || 30000);
    }
    
    cleanup() {
        this.fullScreenManager.exitFullScreen();
    }
}
```

### 2.2 Backend Proctoring Support

```java
@Service
public class ProctoringService {
    
    @Autowired
    private TestAttemptRepository attemptRepository;
    
    public void recordViolation(Long attemptId, ProctoringViolation violation) {
        TestAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));
        
        attempt.setTabSwitchCount(attempt.getTabSwitchCount() + 1);
        
        if (violation.getType() == ViolationType.MULTIPLE_MONITORS) {
            attempt.setMonitorCheckPassed(false);
        }
        
        attemptRepository.save(attempt);
        
        // Log violation
        log.warn("Proctoring violation for attempt {}: {}", 
            attemptId, violation.getMessage());
    }
    
    public void processHeartbeat(Long attemptId, ProctoringHeartbeat heartbeat) {
        TestAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));
        
        // Update attempt with latest proctoring data
        attempt.setTabSwitchCount(heartbeat.getTabSwitches());
        attempt.setLastHeartbeat(LocalDateTime.now());
        
        attemptRepository.save(attempt);
    }
}
```

### Deliverables
- [ ] Monitor detection implementation
- [ ] Full-screen enforcement
- [ ] Tab switch tracking
- [ ] Keyboard shortcut blocking
- [ ] Violation logging and reporting
- [ ] Admin dashboard for violations

---

## Phase 3: Performance Optimization (Week 5-6)

### Objectives
- Achieve 100K - 1M QPS target
- Optimize database queries
- Implement caching strategies
- Setup connection pooling

### 3.1 Database Optimization

#### Read/Write Splitting
```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    @ConfigurationProperties("spring.datasource.write")
    public DataSource writeDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    @ConfigurationProperties("spring.datasource.read")
    public DataSource readDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    public DataSource routingDataSource() {
        RoutingDataSource routingDataSource = new RoutingDataSource();
        
        Map<Object, Object> dataSourceMap = new HashMap<>();
        dataSourceMap.put(DataSourceType.WRITE, writeDataSource());
        dataSourceMap.put(DataSourceType.READ, readDataSource());
        
        routingDataSource.setTargetDataSources(dataSourceMap);
        routingDataSource.setDefaultTargetDataSource(writeDataSource());
        
        return routingDataSource;
    }
}

public class RoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return DataSourceContextHolder.getDataSourceType();
    }
}

@Aspect
@Component
public class DataSourceAspect {
    
    @Before("@annotation(readOnly)")
    public void setReadDataSource(ReadOnly readOnly) {
        DataSourceContextHolder.setDataSourceType(DataSourceType.READ);
    }
    
    @Before("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void setWriteDataSource() {
        DataSourceContextHolder.setDataSourceType(DataSourceType.WRITE);
    }
    
    @After("@annotation(readOnly) || @annotation(org.springframework.transaction.annotation.Transactional)")
    public void clearDataSource() {
        DataSourceContextHolder.clearDataSourceType();
    }
}
```

#### Query Optimization
```java
@Repository
public interface TestRepository extends JpaRepository<Test, Long> {
    
    // Optimized query with JOIN FETCH
    @Query("SELECT t FROM Test t " +
           "LEFT JOIN FETCH t.questions q " +
           "LEFT JOIN FETCH q.options " +
           "WHERE t.id = :testId")
    Optional<Test> findByIdWithQuestionsAndOptions(@Param("testId") Long testId);
    
    // Projection for list views
    @Query("SELECT new com.testcreator.dto.TestSummaryDTO(" +
           "t.id, t.title, t.testDate, t.status, " +
           "COUNT(q.id), t.createdAt) " +
           "FROM Test t LEFT JOIN t.questions q " +
           "WHERE t.createdBy.id = :teacherId " +
           "GROUP BY t.id " +
           "ORDER BY t.createdAt DESC")
    Page<TestSummaryDTO> findTestSummariesByTeacher(
        @Param("teacherId") Long teacherId, 
        Pageable pageable);
    
    // Batch insert optimization
    @Modifying
    @Query(value = "INSERT INTO questions (test_id, question_number, question_text, correct_option_number) " +
                   "VALUES (:testId, :questionNumber, :questionText, :correctOption)", 
           nativeQuery = true)
    void batchInsertQuestions(@Param("testId") Long testId,
                             @Param("questionNumber") Integer questionNumber,
                             @Param("questionText") String questionText,
                             @Param("correctOption") Integer correctOption);
}
```

#### Database Indexing Strategy
```sql
-- Create indexes for frequent queries
CREATE INDEX idx_test_created_by ON tests(created_by_id);
CREATE INDEX idx_test_status ON tests(status);
CREATE INDEX idx_test_date ON tests(test_date);
CREATE INDEX idx_question_test_id ON questions(test_id);
CREATE INDEX idx_option_question_id ON options(question_id);
CREATE INDEX idx_attempt_test_student ON test_attempts(test_id, student_id);
CREATE INDEX idx_attempt_status ON test_attempts(status);
CREATE INDEX idx_student_answer_attempt ON student_answers(attempt_id);

-- Composite indexes
CREATE INDEX idx_test_teacher_status ON tests(created_by_id, status);
CREATE INDEX idx_attempt_student_submitted ON test_attempts(student_id, submitted_at DESC);

-- Partial indexes
CREATE INDEX idx_active_tests ON tests(status) WHERE status = 'PUBLISHED';
```

### 3.2 Caching Strategy

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Test cache - 2 hours
        cacheConfigurations.put("tests", config.entryTtl(Duration.ofHours(2)));
        
        // Questions cache - 4 hours
        cacheConfigurations.put("questions", config.entryTtl(Duration.ofHours(4)));
        
        // User cache - 30 minutes
        cacheConfigurations.put("users", config.entryTtl(Duration.ofMinutes(30)));
        
        // Results cache - 1 hour
        cacheConfigurations.put("results", config.entryTtl(Duration.ofHours(1)));
        
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .withInitialCacheConfigurations(cacheConfigurations)
            .build();
    }
}

@Service
public class TestService {
    
    @Cacheable(value = "tests", key = "#testId")
    @ReadOnly
    public TestDTO getTest(Long testId) {
        // Fetch from database
    }
    
    @CacheEvict(value = "tests", key = "#testId")
    public void updateTest(Long testId, TestDTO testDTO) {
        // Update logic
    }
    
    @Cacheable(value = "questions", key = "#testId")
    @ReadOnly
    public List<QuestionDTO> getQuestions(Long testId) {
        // Fetch questions
    }
}
```

### 3.3 Connection Pooling

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50
      minimum-idle: 10
      connection-timeout: 20000
      idle-timeout: 300000
      max-lifetime: 1200000
      leak-detection-threshold: 60000
      
  redis:
    lettuce:
      pool:
        max-active: 50
        max-idle: 20
        min-idle: 10
        max-wait: 2000ms
      shutdown-timeout: 100ms
```

### 3.4 API Rate Limiting

```java
@Configuration
public class RateLimitConfig {
    
    @Bean
    public RateLimiter rateLimiter(RedisTemplate<String, String> redisTemplate) {
        return new RedisRateLimiter(redisTemplate);
    }
}

@Component
public class RedisRateLimiter {
    
    private final RedisTemplate<String, String> redisTemplate;
    
    public boolean allowRequest(String key, int limit, Duration duration) {
        String redisKey = "rate_limit:" + key;
        Long current = redisTemplate.opsForValue().increment(redisKey);
        
        if (current == 1) {
            redisTemplate.expire(redisKey, duration);
        }
        
        return current <= limit;
    }
}

@Aspect
@Component
public class RateLimitAspect {
    
    @Autowired
    private RedisRateLimiter rateLimiter;
    
    @Around("@annotation(rateLimit)")
    public Object rateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        String key = getCurrentUserEmail();
        
        if (!rateLimiter.allowRequest(key, rateLimit.limit(), rateLimit.duration())) {
            throw new RateLimitExceededException("Too many requests");
        }
        
        return joinPoint.proceed();
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int limit() default 100;
    Duration duration() default Duration.ofMinutes(1);
}
```

### 3.5 Async Processing

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

@Service
public class ResultCalculationService {
    
    @Async("taskExecutor")
    public CompletableFuture<TestResult> calculateResult(Long attemptId) {
        // Expensive calculation
        TestAttempt attempt = attemptRepository.findById(attemptId).orElseThrow();
        
        int score = calculateScore(attempt);
        ResultStatus status = score >= attempt.getTest().getPassingScore() 
            ? ResultStatus.PASS : ResultStatus.FAIL;
        
        attempt.setScore(score);
        attempt.setResult(status);
        attempt.setStatus(AttemptStatus.EVALUATED);
        
        attemptRepository.save(attempt);
        
        return CompletableFuture.completedFuture(
            new TestResult(attemptId, score, status));
    }
}
```

### Deliverables
- [ ] Read/write database splitting
- [ ] Redis caching implementation
- [ ] Connection pool optimization
- [ ] API rate limiting
- [ ] Query optimization
- [ ] Database indexing
- [ ] Async processing for heavy operations

---

## Phase 4: Scalability & High Availability (Week 7-8)

### Objectives
- Setup Kubernetes deployment
- Implement auto-scaling
- Setup monitoring and alerting
- Disaster recovery planning

### 4.1 Kubernetes Deployment

#### Deployment Configuration
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-creator-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-creator-api
  template:
    metadata:
      labels:
        app: test-creator-api
    spec:
      containers:
      - name: api
        image: test-creator/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: test-creator-api
  namespace: production
spec:
  selector:
    app: test-creator-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: test-creator-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: test-creator-api
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 5
        periodSeconds: 30
      selectPolicy: Max
```

### 4.2 Database HA Setup

```yaml
# PostgreSQL StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: production
spec:
  serviceName: postgresql
  replicas: 3
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: testcreator
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
```

### 4.3 Monitoring Setup

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
    - job_name: 'test-creator-api'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: test-creator-api
      - source_labels: [__meta_kubernetes_pod_ip]
        action: replace
        target_label: __address__
        replacement: $1:8080
      metrics_path: '/actuator/prometheus'
```

### 4.4 Logging & Observability

```java
@Configuration
public class ObservabilityConfig {
    
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags("application", "test-creator")
            .commonTags("environment", environment.getActiveProfiles()[0]);
    }
}

@Aspect
@Component
public class MetricsAspect {
    
    private final MeterRegistry meterRegistry;
    
    @Around("@annotation(org.springframework.web.bind.annotation.RequestMapping)")
    public Object measureApiLatency(ProceedingJoinPoint joinPoint) throws Throwable {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            Object result = joinPoint.proceed();
            sample.stop(Timer.builder("api.latency")
                .tag("method", joinPoint.getSignature().getName())
                .tag("status", "success")
                .register(meterRegistry));
            return result;
        } catch (Exception e) {
            sample.stop(Timer.builder("api.latency")
                .tag("method", joinPoint.getSignature().getName())
                .tag("status", "error")
                .register(meterRegistry));
            throw e;
        }
    }
}
```

### Deliverables
- [ ] Kubernetes cluster setup
- [ ] Auto-scaling configuration
- [ ] Database replication
- [ ] Redis cluster setup
- [ ] Prometheus + Grafana monitoring
- [ ] Centralized logging (ELK stack)
- [ ] Alerting rules

---

## Phase 5: Advanced Features (Week 9-10)

### Objectives
- Question bank management
- Test analytics
- Bulk upload of questions
- Email notifications
- Advanced reporting

### 5.1 Question Bank

```java
@Entity
@Table(name = "question_bank")
@Data
public class QuestionBankItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @Column(nullable = false)
    private String subject;
    
    @Column(nullable = false)
    private String topic;
    
    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficulty;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;
    
    @OneToMany(mappedBy = "bankItem", cascade = CascadeType.ALL)
    private List<QuestionBankOption> options;
    
    @Column(nullable = false)
    private Integer correctOptionNumber;
    
    private String explanation;
    
    @ElementCollection
    private List<String> tags;
    
    private Integer usageCount = 0;
    
    @CreatedDate
    private LocalDateTime createdAt;
}

public enum DifficultyLevel {
    EASY, MEDIUM, HARD
}
```

### 5.2 Analytics Service

```java
@Service
public class AnalyticsService {
    
    public TestAnalytics calculateTestAnalytics(Long testId) {
        List<TestAttempt> attempts = attemptRepository.findByTestId(testId);
        
        TestAnalytics analytics = new TestAnalytics();
        analytics.setTestId(testId);
        analytics.setTotalAttempts(attempts.size());
        
        // Calculate statistics
        DoubleSummaryStatistics stats = attempts.stream()
            .mapToDouble(TestAttempt::getScore)
            .summaryStatistics();
        
        analytics.setAverageScore(stats.getAverage());
        analytics.setMinScore(stats.getMin());
        analytics.setMaxScore(stats.getMax());
        
        // Pass/Fail distribution
        long passCount = attempts.stream()
            .filter(a -> a.getResult() == ResultStatus.PASS)
            .count();
        analytics.setPassPercentage((double) passCount / attempts.size() * 100);
        
        // Question-wise analysis
        List<QuestionAnalytics> questionAnalytics = calculateQuestionAnalytics(testId);
        analytics.setQuestionAnalytics(questionAnalytics);
        
        return analytics;
    }
    
    private List<QuestionAnalytics> calculateQuestionAnalytics(Long testId) {
        List<Question> questions = questionRepository.findByTestId(testId);
        
        return questions.stream()
            .map(question -> {
                List<StudentAnswer> answers = studentAnswerRepository
                    .findByQuestionId(question.getId());
                
                long correctCount = answers.stream()
                    .filter(StudentAnswer::getIsCorrect)
                    .count();
                
                QuestionAnalytics qa = new QuestionAnalytics();
                qa.setQuestionId(question.getId());
                qa.setQuestionNumber(question.getQuestionNumber());
                qa.setTotalAttempts(answers.size());
                qa.setCorrectAttempts(correctCount);
                qa.setSuccessRate((double) correctCount / answers.size() * 100);
                
                return qa;
            })
            .collect(Collectors.toList());
    }
}
```

### 5.3 Email Notification Service

```java
@Service
public class EmailNotificationService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Async
    public void sendTestCreatedNotification(Test test, List<User> students) {
        students.forEach(student -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true);
                
                helper.setTo(student.getEmail());
                helper.setSubject("New Test Available: " + test.getTitle());
                helper.setText(buildTestNotificationEmail(test, student), true);
                
                mailSender.send(message);
            } catch (MessagingException e) {
                log.error("Failed to send email to {}", student.getEmail(), e);
            }
        });
    }
    
    @Async
    public void sendResultNotification(TestAttempt attempt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            
            helper.setTo(attempt.getStudent().getEmail());
            helper.setSubject("Test Result: " + attempt.getTest().getTitle());
            helper.setText(buildResultEmail(attempt), true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Failed to send result email", e);
        }
    }
}
```

### 5.4 Bulk Question Upload

```java
@RestController
@RequestMapping("/api/questions")
public class QuestionBulkUploadController {
    
    @PostMapping("/bulk-upload")
    public ResponseEntity<BulkUploadResult> bulkUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("testId") Long testId) {
        
        try {
            List<QuestionDTO> questions = parseQuestionFile(file);
            
            BulkUploadResult result = questionService.bulkCreate(testId, questions);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(BulkUploadResult.error(e.getMessage()));
        }
    }
    
    private List<QuestionDTO> parseQuestionFile(MultipartFile file) throws IOException {
        // Support CSV, Excel, JSON formats
        String filename = file.getOriginalFilename();
        
        if (filename.endsWith(".csv")) {
            return parseCsv(file.getInputStream());
        } else if (filename.endsWith(".xlsx")) {
            return parseExcel(file.getInputStream());
        } else if (filename.endsWith(".json")) {
            return parseJson(file.getInputStream());
        }
        
        throw new IllegalArgumentException("Unsupported file format");
    }
}
```

### Deliverables
- [ ] Question bank management
- [ ] Test analytics dashboard
- [ ] Bulk question upload
- [ ] Email notifications
- [ ] Export results to Excel/PDF
- [ ] Advanced search and filtering

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     User        │         │      Test       │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │────────<│ created_by (FK) │
│ email           │         │ id (PK)         │
│ password        │         │ title           │
│ name            │         │ description     │
│ role            │         │ total_questions │
│ active          │         │ passing_score   │
│ created_at      │         │ duration_min    │
│ updated_at      │         │ test_date       │
└─────────────────┘         │ status          │
                            │ created_at      │
                            └─────────────────┘
                                    │
                                    │ 1
                                    │
                                    │ N
                            ┌───────▼─────────┐
                            │    Question     │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ test_id (FK)    │
                            │ question_number │
                            │ question_text   │
                            │ explanation     │
                            │ correct_option  │
                            └─────────────────┘
                                    │
                                    │ 1
                                    │
                                    │ N
                            ┌───────▼─────────┐
                            │     Option      │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ question_id(FK) │
                            │ option_number   │
                            │ option_text     │
                            └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│      User       │         │   TestAttempt   │
│                 │────────<│ student_id (FK) │
└─────────────────┘         ├─────────────────┤
                            │ id (PK)         │
┌─────────────────┐         │ test_id (FK)    │
│      Test       │────────<│ started_at      │
└─────────────────┘         │ submitted_at    │
                            │ score           │
                            │ correct_answers │
                            │ wrong_answers   │
                            │ status          │
                            │ result          │
                            │ tab_switch_cnt  │
                            │ monitor_check   │
                            └─────────────────┘
                                    │
                                    │ 1
                                    │
                                    │ N
                            ┌───────▼─────────┐
                            │ StudentAnswer   │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ attempt_id (FK) │
                            │ question_id(FK) │
                            │ selected_option │
                            │ is_correct      │
                            │ answered_at     │
                            └─────────────────┘
```

---

## API Specifications

### Authentication APIs

#### POST /api/auth/login
```json
Request:
{
  "email": "teacher@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "teacher@example.com",
    "name": "John Doe",
    "role": "TEACHER"
  }
}
```

### Test Management APIs

#### POST /api/tests
```json
Request:
{
  "title": "Java Fundamentals Quiz",
  "description": "Basic Java concepts",
  "totalQuestions": 10,
  "passingScore": 70,
  "durationMinutes": 30,
  "testDate": "2026-02-20T10:00:00",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "What is Java?",
      "explanation": "Java is a programming language",
      "options": [
        {"optionNumber": 1, "optionText": "Programming Language"},
        {"optionNumber": 2, "optionText": "Coffee"},
        {"optionNumber": 3, "optionText": "Island"},
        {"optionNumber": 4, "optionText": "None"}
      ],
      "correctOptionNumber": 1
    }
  ]
}

Response:
{
  "id": 1,
  "title": "Java Fundamentals Quiz",
  "status": "DRAFT",
  "createdAt": "2026-02-11T10:00:00"
}
```

#### GET /api/tests?page=0&size=10
```json
Response:
{
  "content": [
    {
      "id": 1,
      "title": "Java Fundamentals Quiz",
      "testDate": "2026-02-20T10:00:00",
      "totalQuestions": 10,
      "status": "PUBLISHED",
      "createdAt": "2026-02-11T10:00:00"
    }
  ],
  "totalElements": 50,
  "totalPages": 5,
  "size": 10,
  "number": 0
}
```

### Student Test APIs

#### POST /api/student/tests/{testId}/start
```json
Response:
{
  "attemptId": 101,
  "testId": 1,
  "startedAt": "2026-02-20T10:05:00",
  "durationMinutes": 30,
  "questions": [
    {
      "id": 1,
      "questionNumber": 1,
      "questionText": "What is Java?",
      "options": [
        {"optionNumber": 1, "optionText": "Programming Language"},
        {"optionNumber": 2, "optionText": "Coffee"},
        {"optionNumber": 3, "optionText": "Island"},
        {"optionNumber": 4, "optionText": "None"}
      ]
    }
  ]
}
```

#### POST /api/student/attempts/{attemptId}/answer
```json
Request:
{
  "questionId": 1,
  "selectedOption": 1
}

Response:
{
  "saved": true,
  "timestamp": "2026-02-20T10:10:00"
}
```

#### POST /api/student/attempts/{attemptId}/submit
```json
Response:
{
  "attemptId": 101,
  "score": 85,
  "correctAnswers": 17,
  "wrongAnswers": 3,
  "result": "PASS",
  "submittedAt": "2026-02-20T10:35:00"
}
```

### Results APIs

#### GET /api/results/tests/{testId}
```json
Response:
{
  "testId": 1,
  "testTitle": "Java Fundamentals Quiz",
  "results": [
    {
      "studentId": 10,
      "studentName": "Alice Smith",
      "studentEmail": "alice@example.com",
      "score": 85,
      "status": "PASS",
      "submittedAt": "2026-02-20T10:35:00"
    }
  ],
  "analytics": {
    "totalAttempts": 50,
    "averageScore": 75.5,
    "passPercentage": 80.0
  }
}
```

---

## Security & Proctoring Features

### Multi-layered Security

1. **Authentication Layer**
   - JWT-based authentication
   - Refresh token mechanism
   - Session timeout (24 hours)
   - Concurrent session control

2. **Authorization Layer**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API endpoint protection

3. **Network Security**
   - HTTPS/TLS 1.3 enforcement
   - CORS configuration
   - Rate limiting per user/IP
   - DDoS protection via WAF

4. **Application Security**
   - Input validation
   - SQL injection prevention (JPA/Hibernate)
   - XSS prevention
   - CSRF protection
   - Secure password hashing (BCrypt)

5. **Exam Proctoring**
   - Single monitor enforcement
   - Full-screen mode mandatory
   - Tab/window switch detection
   - Keyboard shortcut blocking
   - Violation tracking and reporting
   - Browser fingerprinting
   - IP address logging

### Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/tests/**").hasRole("TEACHER")
                .requestMatchers("/api/student/**").hasRole("STUDENT")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

---

## Performance & Scalability

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | Prometheus |
| Database Query Time (p95) | < 50ms | Slow query log |
| Throughput | 100K - 1M QPS | Load testing |
| Concurrent Users | 100,000+ | K6/JMeter |
| Page Load Time | < 2s | Lighthouse |
| Availability | 99.9% | Uptime monitoring |

### Scalability Strategy

1. **Horizontal Scaling**
   - Stateless application design
   - Auto-scaling based on CPU/memory
   - Load balancing across instances
   - Session management via Redis

2. **Database Scaling**
   - Read replicas for read-heavy operations
   - Connection pooling (HikariCP)
   - Query optimization and indexing
   - Partitioning for large tables

3. **Caching Strategy**
   - Redis for session storage
   - Application-level caching
   - CDN for static assets
   - Browser caching headers

4. **Performance Optimization**
   - Database query optimization
   - Lazy loading for entities
   - Batch operations
   - Async processing for heavy tasks
   - Response compression

### Load Testing Plan

```javascript
// K6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10000 },   // Ramp up
    { duration: '5m', target: 10000 },   // Stay at 10K users
    { duration: '2m', target: 50000 },   // Ramp to 50K
    { duration: '5m', target: 50000 },   // Stay at 50K
    { duration: '2m', target: 100000 },  // Ramp to 100K
    { duration: '5m', target: 100000 },  // Stay at 100K
    { duration: '5m', target: 0 },       // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Login
  let loginRes = http.post('http://api.test-creator.com/api/auth/login', 
    JSON.stringify({
      email: 'student@example.com',
      password: 'password123'
    }), 
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  let token = JSON.parse(loginRes.body).token;
  
  // Get available tests
  let testsRes = http.get('http://api.test-creator.com/api/student/tests/available', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  check(testsRes, {
    'tests retrieved': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

---

## Deployment Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
│                    (Static Assets, SSL)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Route 53 (DNS)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Application Load Balancer (ALB)                 │
│                    + WAF + Shield                            │
└─────────┬──────────────────────────────────┬────────────────┘
          │                                   │
┌─────────▼─────────┐              ┌─────────▼─────────┐
│   EKS Cluster     │              │   EKS Cluster     │
│   AZ-1            │              │   AZ-2            │
│                   │              │                   │
│ ┌───────────────┐ │              │ ┌───────────────┐ │
│ │ Spring Boot   │ │              │ │ Spring Boot   │ │
│ │ Pods (3-100)  │ │              │ │ Pods (3-100)  │ │
│ └───────────────┘ │              │ └───────────────┘ │
└─────────┬─────────┘              └─────────┬─────────┘
          │                                   │
          └──────────────┬────────────────────┘
                         │
          ┌──────────────┴────────────────┐
          │                                │
┌─────────▼─────────┐          ┌──────────▼──────────┐
│   ElastiCache     │          │  RDS PostgreSQL     │
│   Redis Cluster   │          │  Multi-AZ           │
│   (Session/Cache) │          │  Read Replicas      │
└───────────────────┘          └─────────────────────┘
```

### Container Configuration

```dockerfile
# Dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN ./mvnw install -DskipTests

FROM eclipse-temurin:17-jre-alpine
VOLUME /tmp
ARG JAR_FILE=/workspace/app/target/*.jar
COPY --from=build ${JAR_FILE} app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-XX:+UseStringDeduplication", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", \
  "/app.jar"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Build with Maven
      run: mvn clean package -DskipTests
    
    - name: Run Tests
      run: mvn test
    
    - name: Build Docker Image
      run: |
        docker build -t test-creator/api:${{ github.sha }} .
        docker tag test-creator/api:${{ github.sha }} test-creator/api:latest
    
    - name: Push to ECR
      run: |
        aws ecr get-login-password --region us-east-1 | \
          docker login --username AWS --password-stdin $ECR_REGISTRY
        docker push test-creator/api:${{ github.sha }}
        docker push test-creator/api:latest
    
    - name: Deploy to EKS
      run: |
        kubectl set image deployment/test-creator-api \
          api=test-creator/api:${{ github.sha }}
        kubectl rollout status deployment/test-creator-api
```

---

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │
        ├─────────────┤
        │Integration  │
        │   (15%)     │
        ├─────────────┤
        │    Unit     │
        │   (80%)     │
        └─────────────┘
```

### Unit Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class TestServiceTest {
    
    @Autowired
    private TestService testService;
    
    @MockBean
    private TestRepository testRepository;
    
    @Test
    void shouldCreateTest() {
        // Given
        TestDTO testDTO = new TestDTO();
        testDTO.setTitle("Java Quiz");
        testDTO.setTotalQuestions(10);
        
        Test test = new Test();
        test.setId(1L);
        test.setTitle("Java Quiz");
        
        when(testRepository.save(any(Test.class))).thenReturn(test);
        
        // When
        TestDTO result = testService.createTest(testDTO);
        
        // Then
        assertNotNull(result);
        assertEquals("Java Quiz", result.getTitle());
        verify(testRepository, times(1)).save(any(Test.class));
    }
}
```

### Integration Tests

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase
class TestControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateAndRetrieveTest() {
        // Create test
        TestDTO testDTO = new TestDTO();
        testDTO.setTitle("Integration Test");
        
        ResponseEntity<TestDTO> createResponse = restTemplate
            .postForEntity("/api/tests", testDTO, TestDTO.class);
        
        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody().getId());
        
        // Retrieve test
        Long testId = createResponse.getBody().getId();
        ResponseEntity<TestDTO> getResponse = restTemplate
            .getForEntity("/api/tests/" + testId, TestDTO.class);
        
        assertEquals(HttpStatus.OK, getResponse.getStatusCode());
        assertEquals("Integration Test", getResponse.getBody().getTitle());
    }
}
```

### Performance Tests

```java
@SpringBootTest
class PerformanceTest {
    
    @Autowired
    private TestService testService;
    
    @Test
    void shouldHandleHighConcurrency() throws InterruptedException {
        int threadCount = 1000;
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        
        ExecutorService executor = Executors.newFixedThreadPool(100);
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    testService.getTest(1L);
                    successCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await(30, TimeUnit.SECONDS);
        
        assertEquals(threadCount, successCount.get());
    }
}
```

---

## Future Enhancements

### Phase 6: Advanced Proctoring
- Webcam monitoring
- Eye tracking
- Facial recognition
- AI-based cheating detection
- Screen recording

### Phase 7: AI/ML Integration
- Automated question generation
- Adaptive testing (difficulty adjustment)
- Plagiarism detection
- Natural language processing for answers
- Predictive analytics

### Phase 8: Mobile Applications
- Native iOS app (Swift)
- Native Android app (Kotlin)
- Offline test-taking capability
- Push notifications

### Phase 9: Collaboration Features
- Shared question banks
- Peer review system
- Teacher collaboration
- Student study groups

### Phase 10: Enterprise Features
- Multi-tenancy support
- White-labeling
- Advanced analytics and reporting
- Integration with LMS (Moodle, Canvas)
- SCORM compliance
- SSO integration (SAML, OAuth)

---

## Conclusion

This technical documentation provides a comprehensive roadmap for building a high-performance, secure online test creator application. The phased approach allows for incremental development while maintaining flexibility for future enhancements.

### Key Success Factors
1. **Performance**: Achieving 100K-1M QPS through optimization
2. **Security**: Multi-layered security with exam proctoring
3. **Scalability**: Kubernetes-based auto-scaling
4. **Maintainability**: Clean architecture with SOLID principles
5. **Monitoring**: Comprehensive observability stack

### Next Steps
1. Review and approve architecture
2. Setup development environment
3. Begin Phase 0 implementation
4. Establish development workflow
5. Start sprint planning

---

**Document Version**: 1.0  
**Last Updated**: February 11, 2026  
**Author**: Senior Java Architect  
**Status**: Draft for Review
