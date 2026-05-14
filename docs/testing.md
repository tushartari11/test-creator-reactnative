# Testing

## Test Naming Convention

```
methodName_scenario_expectedResult
```

## Unit Tests (Mockito)

```java
@ExtendWith(MockitoExtension.class)
class TestServiceTest {
    @Mock private TestRepository testRepository;
    @InjectMocks private TestService testService;

    @Test
    void createTest_withValidRequest_returnsTestDTO() { ... }
}
```

## Integration Tests (Testcontainers)

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class ControllerTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");
}
```

## Maven Commands

```bash
mvn test                                         # All tests
mvn test -Dtest=TestServiceTest                  # Single class
mvn test -Dtest=TestServiceTest#methodName       # Single method
mvn clean test jacoco:report                     # With coverage report
```

---

See [project_status.md](project_status.md) for phase progress and the authentication testing walkthrough.
