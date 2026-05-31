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

## Frontend E2E Tests (Playwright + BDD)

End-to-end tests live in `frontend/e2e/`. Scenarios are written in Gherkin (`.feature` files) and executed by [`playwright-bdd`](https://vitalets.github.io/playwright-bdd/), which generates Playwright specs on the fly.

### Layout

```
frontend/e2e/
├── features/      Gherkin scenarios (Given / When / Then)
├── steps/         Step implementations
├── pages/         Page Object Models
├── hooks/         world.ts — per-scenario fixtures (scenarioId, cleanup)
├── support/       env loading, helpers
└── playwright.config.ts
```

### One-time setup

```bash
cd frontend
npm install
npm run test:e2e:install   # downloads Chromium for Playwright
npm run export:web         # produces dist/ — the static bundle tests load
cp .env.e2e.example e2e/.env.e2e   # tweak baseURL if needed
```

### Running

| Command | Mode | When |
|---|---|---|
| `npm run test:e2e:dev` | Headed (Chromium opens) | Local development, watch the browser |
| `npm run test:e2e:ui` | Playwright UI mode | Authoring / debugging scenarios |
| `npm run test:e2e:debug` | Inspector + headed | Step-through debugging |
| `npm run test:e2e` | Headless | Local CI-like dry run |
| `npm run test:e2e:ci` | Headless + retries + GitHub reporter | CI environments |
| `npm run test:e2e:report` | Open last HTML report | After a failed run |

The Playwright config auto-starts `serve` on port `4173` against `frontend/dist`. In dev, it reuses an already-running server; in CI, it starts a fresh one. Phase 2 will swap this to Spring Boot serving the bundle from `:8080`.

### Writing a scenario

`features/<area>/<thing>.feature`:
```gherkin
Feature: Student takes a test
  Scenario: Submits all answers correctly
    Given a student "bob@school.test" exists
    When "bob@school.test" submits all answers correctly
    Then they see a score of "3/3"
```

`steps/student.steps.ts`:
```ts
import { Given, When, Then } from '../hooks/world';

Given('a student {string} exists', async ({ scenario }, email) => {
  // Phase 2: testSupport.createStudent(scenario.id, { email })
});
```

### Per-scenario isolation

Every scenario gets a fresh `scenarioId` (UUID) via the `scenario` fixture in `hooks/world.ts`. From Phase 2, that ID is passed to `POST /api/test-support/scenarios/{id}/...` to create fixtures, and the `try/finally` in the fixture calls `DELETE /api/test-support/scenarios/{id}` on the way out — **runs on failure too**, so the DB ends in the same state it started in.

---

See [project_status.md](project_status.md) for phase progress and the authentication testing walkthrough.
