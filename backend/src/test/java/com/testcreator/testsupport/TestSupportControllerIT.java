package com.testcreator.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import com.testcreator.testsupport.dto.TestSupportDtos.CreateScenarioResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.HealthResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * End-to-end verification of the test-support module against a real Postgres.
 *
 * <p>Three properties matter:
 *
 * <ol>
 *   <li>The test-support endpoints are reachable without authentication.
 *   <li>Setup followed by cleanup leaves every relevant table at its baseline row count.
 *   <li>The startup guard requires the DB name to end with {@code _e2e}.
 * </ol>
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("e2e")
class TestSupportControllerIT {

  @Container
  @SuppressWarnings("resource")
  static final PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:15-alpine")
          .withDatabaseName("testcreator_e2e")
          .withUsername("e2e")
          .withPassword("e2e");

  @DynamicPropertySource
  static void springProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.data.redis.host", () -> "localhost");
    registry.add("spring.data.redis.port", () -> "6379");
  }

  @LocalServerPort int port;
  @Autowired TestRestTemplate rest;
  @Autowired JdbcTemplate jdbc;

  private String baseUrl() {
    return "http://localhost:" + port + "/api/test-support";
  }

  @BeforeEach
  void cleanSlate() {
    // Defensive — in case a prior IT left rows behind.
    jdbc.execute(
        "TRUNCATE proctoring_violations, student_answers, test_attempts, "
            + "guest_sessions, options, questions, tests, users RESTART IDENTITY CASCADE");
  }

  @Test
  @DisplayName("health endpoint reports an active e2e module")
  void healthEndpoint_reportsActive() {
    ResponseEntity<HealthResponse> health =
        rest.getForEntity(baseUrl() + "/health", HealthResponse.class);
    assertThat(health.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(health.getBody()).isNotNull();
    assertThat(health.getBody().enabled()).isTrue();
    assertThat(health.getBody().dbName()).endsWith("_e2e");
  }

  @Test
  @DisplayName("setup creates rows, delete removes exactly those rows")
  void setupThenDelete_leavesDbAtBaseline() {
    Map<String, Long> baseline = rowCounts();

    // Setup
    UUID scenarioId = createScenario();
    Long teacherId = createTeacher(scenarioId, "teacher-" + shortId(scenarioId) + "@e2e.test").id();
    Long studentId = createStudent(scenarioId, "student-" + shortId(scenarioId) + "@e2e.test").id();
    CreateTestResponse test = createTest(scenarioId, teacherId);

    Map<String, Long> afterSetup = rowCounts();
    assertThat(afterSetup.get("users")).isEqualTo(baseline.get("users") + 2);
    assertThat(afterSetup.get("tests")).isEqualTo(baseline.get("tests") + 1);
    assertThat(afterSetup.get("questions"))
        .isEqualTo(baseline.get("questions") + test.questions().size());
    long expectedOptions =
        baseline.get("options")
            + test.questions().stream().mapToLong(q -> q.optionIds().size()).sum();
    assertThat(afterSetup.get("options")).isEqualTo(expectedOptions);

    // Cleanup
    ResponseEntity<Void> delete =
        rest.exchange(
            baseUrl() + "/scenarios/" + scenarioId,
            org.springframework.http.HttpMethod.DELETE,
            null,
            Void.class);
    assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

    assertThat(rowCounts()).isEqualTo(baseline);

    // Belt-and-braces: not just empty deltas — every value is zero since we truncated up top.
    rowCounts()
        .forEach(
            (table, count) ->
                assertThat(count).as("Table %s should be empty after cleanup", table).isZero());

    // teacherId / studentId now stale references — confirm absence.
    assertThat(
            jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id IN (?, ?)", Long.class, teacherId, studentId))
        .isZero();
  }

  @Test
  @DisplayName("deleting an unknown scenario is idempotent (204)")
  void deleteUnknown_returnsNoContent() {
    ResponseEntity<Void> response =
        rest.exchange(
            baseUrl() + "/scenarios/" + UUID.randomUUID(),
            org.springframework.http.HttpMethod.DELETE,
            null,
            Void.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
  }

  @Test
  @DisplayName("creating a teacher in an unknown scenario returns 404")
  void createTeacherInUnknownScenario_returns404() {
    ResponseEntity<String> response =
        rest.postForEntity(
            baseUrl() + "/scenarios/" + UUID.randomUUID() + "/teachers",
            new CreateUserRequest("ghost@e2e.test", "Ghost", "Password123"),
            String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  private UUID createScenario() {
    ResponseEntity<CreateScenarioResponse> response =
        rest.postForEntity(baseUrl() + "/scenarios", null, CreateScenarioResponse.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return response.getBody().scenarioId();
  }

  private CreateUserResponse createTeacher(UUID scenarioId, String email) {
    ResponseEntity<CreateUserResponse> response =
        rest.postForEntity(
            baseUrl() + "/scenarios/" + scenarioId + "/teachers",
            new CreateUserRequest(email, "Teacher", "Password123"),
            CreateUserResponse.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return response.getBody();
  }

  private CreateUserResponse createStudent(UUID scenarioId, String email) {
    ResponseEntity<CreateUserResponse> response =
        rest.postForEntity(
            baseUrl() + "/scenarios/" + scenarioId + "/students",
            new CreateUserRequest(email, "Student", "Password123"),
            CreateUserResponse.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return response.getBody();
  }

  private CreateTestResponse createTest(UUID scenarioId, Long teacherId) {
    ResponseEntity<CreateTestResponse> response =
        rest.postForEntity(
            baseUrl() + "/scenarios/" + scenarioId + "/tests",
            new CreateTestRequest(teacherId, "IT Test", 30, 1, true, true, null),
            CreateTestResponse.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return response.getBody();
  }

  private Map<String, Long> rowCounts() {
    Map<String, Long> counts = new LinkedHashMap<>();
    for (String table :
        new String[] {
          "users", "tests", "questions", "options",
          "test_attempts", "student_answers", "guest_sessions", "proctoring_violations"
        }) {
      counts.put(table, jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class));
    }
    return counts;
  }

  private static String shortId(UUID id) {
    return id.toString().substring(0, 8);
  }
}
