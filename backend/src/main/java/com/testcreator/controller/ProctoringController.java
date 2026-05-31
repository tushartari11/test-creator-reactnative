package com.testcreator.controller;

import com.testcreator.dto.proctoring.ViolationDTO;
import com.testcreator.dto.proctoring.ViolationSummaryDTO;
import com.testcreator.entity.TestAttempt;
import com.testcreator.exception.ForbiddenException;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import com.testcreator.security.SecurityUtil;
import com.testcreator.service.ProctoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for proctoring management (Teacher access).
 *
 * <p>Allows teachers to view proctoring violations and analytics for their tests and student
 * attempts.
 */
@RestController
@RequestMapping("/api/proctoring")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Proctoring", description = "Proctoring violation management (Teacher only)")
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasRole('TEACHER')")
public class ProctoringController {

  private final ProctoringService proctoringService;
  private final TestAttemptRepository attemptRepository;
  private final TestRepository testRepository;
  private final SecurityUtil securityUtil;

  /**
   * Gets all violations for a specific attempt.
   *
   * @param attemptId the attempt ID
   * @return list of violations
   */
  @GetMapping("/attempts/{attemptId}/violations")
  @Operation(
      summary = "Get violations for attempt",
      description = "Retrieves all proctoring violations recorded for a specific test attempt")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Violations retrieved",
        content = @Content(schema = @Schema(implementation = ViolationDTO.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Not your test"),
    @ApiResponse(responseCode = "404", description = "Attempt not found")
  })
  public ResponseEntity<List<ViolationDTO>> getViolationsForAttempt(
      @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

    log.info("Get violations for attempt: {}", attemptId);

    // Validate teacher owns this test
    validateTeacherOwnsAttempt(attemptId);

    List<ViolationDTO> violations = proctoringService.getViolations(attemptId);

    return ResponseEntity.ok(violations);
  }

  /**
   * Gets a summary of violations for an attempt.
   *
   * @param attemptId the attempt ID
   * @return violation summary
   */
  @GetMapping("/attempts/{attemptId}/summary")
  @Operation(
      summary = "Get violation summary for attempt",
      description = "Retrieves a summary of violations with counts by type and severity")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Summary retrieved",
        content = @Content(schema = @Schema(implementation = ViolationSummaryDTO.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Not your test"),
    @ApiResponse(responseCode = "404", description = "Attempt not found")
  })
  public ResponseEntity<ViolationSummaryDTO> getViolationSummary(
      @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

    log.info("Get violation summary for attempt: {}", attemptId);

    validateTeacherOwnsAttempt(attemptId);

    ViolationSummaryDTO summary = proctoringService.getViolationSummary(attemptId);

    return ResponseEntity.ok(summary);
  }

  /**
   * Gets violation summaries for all attempts of a test.
   *
   * @param testId the test ID
   * @return list of violation summaries
   */
  @GetMapping("/tests/{testId}/violations")
  @Operation(
      summary = "Get violations for all attempts of a test",
      description = "Retrieves violation summaries for all students who attempted the test")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Summaries retrieved"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Not your test"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<List<ViolationSummaryDTO>> getViolationsForTest(
      @Parameter(description = "Test ID") @PathVariable Long testId) {

    log.info("Get violations for test: {}", testId);

    validateTeacherOwnsTest(testId);

    List<ViolationSummaryDTO> summaries = proctoringService.getViolationSummariesForTest(testId);

    return ResponseEntity.ok(summaries);
  }

  /** Validates that the current teacher owns the attempt's test. */
  private void validateTeacherOwnsAttempt(Long attemptId) {
    TestAttempt attempt =
        attemptRepository
            .findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    String testCreatorEmail = attempt.getTest().getCreatedBy().getEmail();

    if (!currentUserEmail.equals(testCreatorEmail)) {
      throw new ForbiddenException("You don't have access to this attempt");
    }
  }

  /** Validates that the current teacher owns the test. */
  private void validateTeacherOwnsTest(Long testId) {
    var test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    String testCreatorEmail = test.getCreatedBy().getEmail();

    if (!currentUserEmail.equals(testCreatorEmail)) {
      throw new ForbiddenException("You don't have access to this test");
    }
  }
}
