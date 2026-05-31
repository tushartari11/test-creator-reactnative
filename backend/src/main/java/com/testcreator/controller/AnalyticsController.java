package com.testcreator.controller;

import com.testcreator.dto.analytics.QuestionAnalyticsDTO;
import com.testcreator.dto.analytics.StudentAttemptSummaryDTO;
import com.testcreator.dto.analytics.TestAnalyticsDTO;
import com.testcreator.dto.analytics.TestSummaryDTO;
import com.testcreator.security.SecurityUtil;
import com.testcreator.service.TeacherAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for teacher analytics and results.
 *
 * <p>Provides endpoints for viewing test analytics, student results, and exporting data.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Analytics", description = "Test analytics and results for teachers")
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasRole('TEACHER')")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class AnalyticsController {

  private final TeacherAnalyticsService analyticsService;
  private final SecurityUtil securityUtil;

  /**
   * Gets list of tests with summary analytics.
   *
   * @param page page number
   * @param size page size
   * @return page of test summaries
   */
  @GetMapping("/tests")
  @Operation(
      summary = "Get test summaries",
      description = "Retrieves list of teacher's tests with summary analytics")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Test summaries retrieved",
        content = @Content(schema = @Schema(implementation = TestSummaryDTO.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorized")
  })
  public ResponseEntity<Page<TestSummaryDTO>> getTestSummaries(
      @Parameter(description = "Page number") @RequestParam(defaultValue = "0") @Min(0) int page,
      @Parameter(description = "Page size") @RequestParam(defaultValue = "10") @Min(1) @Max(100)
          int size) {

    String teacherEmail = securityUtil.getCurrentUserEmail();
    log.info("Getting test summaries for teacher: {}", teacherEmail);

    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<TestSummaryDTO> summaries = analyticsService.getTestSummaries(teacherEmail, pageable);

    return ResponseEntity.ok(summaries);
  }

  /**
   * Gets comprehensive analytics for a specific test.
   *
   * @param testId the test ID
   * @return full test analytics
   */
  @GetMapping("/tests/{testId}")
  @Operation(
      summary = "Get test analytics",
      description =
          "Retrieves comprehensive analytics for a specific test including score distribution,"
              + " question analysis, and student results")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Analytics retrieved",
        content = @Content(schema = @Schema(implementation = TestAnalyticsDTO.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<TestAnalyticsDTO> getTestAnalytics(
      @Parameter(description = "Test ID") @PathVariable Long testId) {

    String teacherEmail = securityUtil.getCurrentUserEmail();
    log.info("Getting analytics for test: {} by teacher: {}", testId, teacherEmail);

    TestAnalyticsDTO analytics = analyticsService.getTestAnalytics(testId, teacherEmail);

    return ResponseEntity.ok(analytics);
  }

  /**
   * Gets student results for a test (paginated).
   *
   * @param testId the test ID
   * @param page page number
   * @param size page size
   * @return page of student results
   */
  @GetMapping("/tests/{testId}/students")
  @Operation(
      summary = "Get student results",
      description = "Retrieves paginated student results for a specific test")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Student results retrieved",
        content = @Content(schema = @Schema(implementation = StudentAttemptSummaryDTO.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<Page<StudentAttemptSummaryDTO>> getStudentResults(
      @Parameter(description = "Test ID") @PathVariable Long testId,
      @Parameter(description = "Page number") @RequestParam(defaultValue = "0") @Min(0) int page,
      @Parameter(description = "Page size") @RequestParam(defaultValue = "20") @Min(1) @Max(100)
          int size,
      @Parameter(description = "Sort by") @RequestParam(defaultValue = "submittedAt") String sortBy,
      @Parameter(description = "Sort direction") @RequestParam(defaultValue = "DESC")
          String sortDir) {

    String teacherEmail = securityUtil.getCurrentUserEmail();
    log.info("Getting student results for test: {}", testId);

    Sort sort =
        sortDir.equalsIgnoreCase("ASC")
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
    Pageable pageable = PageRequest.of(page, size, sort);

    Page<StudentAttemptSummaryDTO> results =
        analyticsService.getStudentResults(testId, teacherEmail, pageable);

    return ResponseEntity.ok(results);
  }

  /**
   * Exports test results as CSV file.
   *
   * @param testId the test ID
   * @return CSV file download
   */
  @GetMapping("/tests/{testId}/export/csv")
  @Operation(
      summary = "Export results to CSV",
      description = "Downloads test results as a CSV file")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "CSV file generated"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<byte[]> exportResultsToCsv(
      @Parameter(description = "Test ID") @PathVariable Long testId) {

    String teacherEmail = securityUtil.getCurrentUserEmail();
    log.info("Exporting results to CSV for test: {}", testId);

    String csv = analyticsService.exportResultsToCsv(testId, teacherEmail);
    byte[] csvBytes = csv.getBytes();

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType("text/csv"));
    headers.setContentDispositionFormData("attachment", "test_results_" + testId + ".csv");
    headers.setContentLength(csvBytes.length);

    return ResponseEntity.ok().headers(headers).body(csvBytes);
  }

  /**
   * Gets question-level analytics for a test.
   *
   * @param testId the test ID
   * @return list of question analytics
   */
  @GetMapping("/tests/{testId}/questions")
  @Operation(
      summary = "Get question analytics",
      description = "Retrieves per-question analytics showing difficulty and answer distribution")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Question analytics retrieved"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<List<QuestionAnalyticsDTO>> getQuestionAnalytics(
      @Parameter(description = "Test ID") @PathVariable Long testId) {

    String teacherEmail = securityUtil.getCurrentUserEmail();
    log.info("Getting question analytics for test: {}", testId);

    TestAnalyticsDTO analytics = analyticsService.getTestAnalytics(testId, teacherEmail);

    return ResponseEntity.ok(analytics.getQuestionAnalytics());
  }
}
