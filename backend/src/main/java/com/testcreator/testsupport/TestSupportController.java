package com.testcreator.testsupport;

import com.testcreator.entity.Role;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateGuestAccessRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateGuestAccessResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateScenarioResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.HealthResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.LoginAsRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.LoginAsResponse;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-support REST surface. Profile-guarded — never registered outside the {@code e2e} profile.
 * Endpoints:
 *
 * <pre>
 * POST   /api/test-support/scenarios
 * POST   /api/test-support/scenarios/{id}/teachers
 * POST   /api/test-support/scenarios/{id}/students
 * POST   /api/test-support/scenarios/{id}/tests
 * POST   /api/test-support/scenarios/{id}/guest-access
 * POST   /api/test-support/scenarios/{id}/login-as
 * DELETE /api/test-support/scenarios/{id}
 * GET    /api/test-support/health
 * </pre>
 */
@RestController
@RequestMapping("/api/test-support")
@Profile("e2e")
@RequiredArgsConstructor
@Slf4j
public class TestSupportController {

  private final TestSupportService service;
  private final TestSupportProperties props;

  @Value("${spring.datasource.url}")
  private String datasourceUrl;

  @Value("${spring.data.redis.database:0}")
  private String redisDb;

  @GetMapping("/health")
  public HealthResponse health() {
    return new HealthResponse(
        "UP",
        service.activeScenarioCount(),
        TestSupportStartupGuard.extractDbName(datasourceUrl),
        redisDb,
        props.isEnabled());
  }

  @PostMapping("/scenarios")
  public ResponseEntity<CreateScenarioResponse> createScenario() {
    UUID id = service.createScenario();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(new CreateScenarioResponse(id, Instant.now()));
  }

  @PostMapping("/scenarios/{id}/teachers")
  public ResponseEntity<CreateUserResponse> createTeacher(
      @PathVariable("id") UUID scenarioId, @RequestBody CreateUserRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createUser(scenarioId, req, Role.TEACHER));
  }

  @PostMapping("/scenarios/{id}/students")
  public ResponseEntity<CreateUserResponse> createStudent(
      @PathVariable("id") UUID scenarioId, @RequestBody CreateUserRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createUser(scenarioId, req, Role.STUDENT));
  }

  @PostMapping("/scenarios/{id}/tests")
  public ResponseEntity<CreateTestResponse> createTest(
      @PathVariable("id") UUID scenarioId, @RequestBody CreateTestRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.createTest(scenarioId, req));
  }

  @PostMapping("/scenarios/{id}/guest-access")
  public ResponseEntity<CreateGuestAccessResponse> createGuestAccess(
      @PathVariable("id") UUID scenarioId, @RequestBody CreateGuestAccessRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createGuestAccess(scenarioId, req));
  }

  @PostMapping("/scenarios/{id}/login-as")
  public LoginAsResponse loginAs(
      @PathVariable("id") UUID scenarioId, @RequestBody LoginAsRequest req) {
    return service.loginAs(scenarioId, req.userId());
  }

  @DeleteMapping("/scenarios/{id}")
  public ResponseEntity<Void> deleteScenario(@PathVariable("id") UUID scenarioId) {
    service.deleteScenario(scenarioId);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(ScenarioLedger.ScenarioNotFoundException.class)
  public ResponseEntity<Map<String, String>> handleNotFound(
      ScenarioLedger.ScenarioNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
  }
}
