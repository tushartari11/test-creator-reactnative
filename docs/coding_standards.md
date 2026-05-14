# Coding Standards

## Entity Design Rules

- **Use `@Getter @Setter`, NOT `@Data`** — `@Data` causes issues with bidirectional relationships
- **Always `FetchType.LAZY`** for `@ManyToOne` and `@OneToMany` — prevents N+1 queries
- **Add indexes** on frequently queried columns
- **Use `LocalDateTime`**, not `Date`
- **Initialize collections**: `private List<X> items = new ArrayList<>()`

## Controller & Service Patterns

- **Constructor injection** via `@RequiredArgsConstructor` (not `@Autowired` fields)
- **Return DTOs**, never entities
- **Use `@PreAuthorize`** for role-based access control
- **Validate inputs** with `@Valid @RequestBody`
- **Always paginate** list endpoints (`Page<DTO>`)

## Repository Patterns

Use `JOIN FETCH` for related entities to avoid N+1 queries:

```java
@Query("SELECT t FROM Test t LEFT JOIN FETCH t.questions q LEFT JOIN FETCH q.options WHERE t.id = :id")
Optional<Test> findByIdWithQuestionsAndOptions(@Param("id") Long id);
```

---

## Exception Handling

Custom exceptions in `com.testcreator.exception/`:

| Exception | HTTP Status |
|-----------|-------------|
| `ResourceNotFoundException` | 404 |
| `ForbiddenException` | 403 |
| `ValidationException` | 400 |
| `BusinessException` | 400 |
| `UnauthorizedException` | 401 |
| `DuplicateEmailException` | 409 |

Global handler: `GlobalExceptionHandler` returns `ErrorResponse` DTO.

---

## Database Migrations

Located in `backend/src/main/resources/db/migration/` (V1–V11 currently).

**Rules**:
- Never modify existing migrations
- Filename format: `V{number}__{description}.sql`
- Always add indexes on foreign keys and frequently queried columns
