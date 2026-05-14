package com.testcreator.controller;

import com.testcreator.dto.proctoring.ReportViolationRequest;
import com.testcreator.dto.proctoring.ViolationResponseDTO;
import com.testcreator.dto.student.*;
import com.testcreator.service.ProctoringService;
import com.testcreator.service.StudentTestService;
import com.testcreator.service.TestAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for student test operations.
 *
 * <p>
 * Handles test browsing, taking tests, and viewing results.
 * Restricted to students.
 */
@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Student Tests", description = "Student test taking and result viewing (Student only)")
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasRole('STUDENT')")
public class StudentTestController {

    private final StudentTestService studentTestService;
    private final TestAttemptService testAttemptService;
    private final ProctoringService proctoringService;

    /**
     * Gets list of available tests for the student.
     *
     * @param page page number
     * @param size page size
     * @return page of available tests
     */
    @GetMapping("/tests/available")
    @Operation(summary = "Get available tests", description = "Retrieves list of published tests available for the student to attempt")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tests retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<Page<AvailableTestDTO>> getAvailableTests(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {

        log.info("Get available tests request - page: {}, size: {}", page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "testDate"));
        Page<AvailableTestDTO> tests = studentTestService.getAvailableTests(pageable);

        return ResponseEntity.ok(tests);
    }

    /**
     * Starts a new test attempt.
     *
     * @param testId test ID
     * @return started test with questions
     */
    @PostMapping("/tests/{testId}/start")
    @Operation(summary = "Start a test attempt", description = "Starts a new test attempt, initializing a test session with time limit")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Attempt started successfully"),
            @ApiResponse(responseCode = "400", description = "Cannot start attempt"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Test not found")
    })
    public ResponseEntity<TestAttemptDTO> startAttempt(
            @Parameter(description = "Test ID") @PathVariable Long testId) {

        log.info("Start test attempt request - testId: {}", testId);
        TestAttemptDTO attempt = testAttemptService.startAttempt(testId);

        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }

    /**
     * Gets current test attempt progress.
     *
     * @param attemptId attempt ID
     * @return current attempt status and progress
     */
    @GetMapping("/attempts/{attemptId}")
    @Operation(summary = "Get attempt progress", description = "Retrieves current progress of an ongoing test attempt")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Attempt progress retrieved"),
            @ApiResponse(responseCode = "400", description = "Attempt expired"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Cannot access this attempt"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<TestAttemptDTO> getAttemptProgress(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

        log.info("Get attempt progress request - attemptId: {}", attemptId);
        TestAttemptDTO attempt = testAttemptService.getAttemptProgress(attemptId);

        return ResponseEntity.ok(attempt);
    }

    /**
     * Submits an answer for a question.
     *
     * @param attemptId attempt ID
     * @param request   answer submission request
     * @return success confirmation
     */
    @PostMapping("/attempts/{attemptId}/answer")
    @Operation(summary = "Submit an answer", description = "Submits answer for a single question. Auto-saves to server.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Answer saved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid answer or attempt expired"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Cannot submit to this attempt"),
            @ApiResponse(responseCode = "404", description = "Attempt or question not found")
    })
    public ResponseEntity<Void> submitAnswer(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId,
            @Valid @RequestBody SubmitAnswerRequest request) {

        log.info("Submit answer request - attemptId: {}, questionId: {}, option: {}",
                attemptId, request.getQuestionId(), request.getSelectedOption());

        testAttemptService.submitAnswer(attemptId, request);

        return ResponseEntity.ok().build();
    }

    /**
     * Submits entire test for grading.
     *
     * @param attemptId attempt ID
     * @return test result with score
     */
    @PostMapping("/attempts/{attemptId}/submit")
    @Operation(summary = "Submit test for grading", description = "Submits entire test for auto-grading and score calculation. Ends the session.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Test submitted and graded"),
            @ApiResponse(responseCode = "400", description = "Cannot submit attempt"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Cannot submit this attempt"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<TestResultDTO> submitTest(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

        log.info("Submit test request - attemptId: {}", attemptId);
        TestResultDTO result = testAttemptService.submitTest(attemptId);

        return ResponseEntity.ok(result);
    }

    /**
     * Gets all test results for the student.
     *
     * @param page page number
     * @param size page size
     * @return page of results
     */
    @GetMapping("/results")
    @Operation(summary = "Get all test results", description = "Retrieves summary of all test results for the student")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Results retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<Page<StudentResultSummaryDTO>> getAllResults(
            @Parameter(description = "Page number") @RequestParam(defaultValue = "0") @Min(0) int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {

        log.info("Get all results request - page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "submittedAt"));
        Page<StudentResultSummaryDTO> results = testAttemptService.getAllResultsForCurrentStudent(pageable);
        return ResponseEntity.ok(results);
    }

    /**
     * Gets detailed result for a specific attempt.
     *
     * @param attemptId attempt ID
     * @return detailed test result
     */
    @GetMapping("/results/{attemptId}")
    @Operation(summary = "Get detailed result", description = "Retrieves detailed result showing all questions, answers, and explanations")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Result retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Cannot access this result"),
            @ApiResponse(responseCode = "404", description = "Result not found")
    })
    public ResponseEntity<TestResultDTO> getDetailedResult(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

        log.info("Get detailed result request - attemptId: {}", attemptId);
        TestResultDTO result = testAttemptService.getDetailedResult(attemptId);
        return ResponseEntity.ok(result);
    }

    /**
     * Auto-saves answer to Redis cache (fast, non-blocking).
     *
     * @param attemptId attempt ID
     * @param request   answer submission request
     * @return success confirmation
     */
    @PostMapping("/attempts/{attemptId}/autosave")
    @Operation(summary = "Auto-save answer (fast)", description = "Caches answer to Redis for quick auto-save. Background job syncs to database.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Answer cached successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid answer"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<Void> autoSaveAnswer(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId,
            @Valid @RequestBody SubmitAnswerRequest request) {

        log.debug("Auto-save answer - attemptId: {}, questionId: {}", attemptId, request.getQuestionId());
        testAttemptService.autoSaveAnswer(attemptId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * Recovers cached answers for session recovery.
     *
     * @param attemptId attempt ID
     * @return list of cached answers
     */
    @GetMapping("/attempts/{attemptId}/recover")
    @Operation(summary = "Recover cached answers", description = "Retrieves answers from Redis cache for session recovery after disconnect")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cached answers retrieved"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Not your attempt"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<List<CachedAnswerDTO>> recoverCachedAnswers(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

        log.info("Recover cached answers - attemptId: {}", attemptId);
        List<CachedAnswerDTO> cachedAnswers = testAttemptService.recoverCachedAnswers(attemptId);
        return ResponseEntity.ok(cachedAnswers);
    }

    /**
     * Sends heartbeat to keep session alive and track activity.
     *
     * @param attemptId attempt ID
     * @return success confirmation
     */
    @PostMapping("/attempts/{attemptId}/heartbeat")
    @Operation(summary = "Send heartbeat", description = "Updates session activity timestamp for monitoring and recovery")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Heartbeat recorded"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<Void> sendHeartbeat(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

        log.debug("Heartbeat received - attemptId: {}", attemptId);
        testAttemptService.sendHeartbeat(attemptId);
        return ResponseEntity.ok().build();
    }

    /**
     * Reports a proctoring violation from the frontend.
     *
     * @param attemptId attempt ID
     * @param request   violation details
     * @return response with action instructions
     */
    @PostMapping("/attempts/{attemptId}/violation")
    @Operation(summary = "Report proctoring violation", description = "Records a proctoring violation detected by the frontend (tab switch, copy attempt, etc.)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Violation recorded", content = @Content(schema = @Schema(implementation = ViolationResponseDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Attempt not found")
    })
    public ResponseEntity<ViolationResponseDTO> reportViolation(
            @Parameter(description = "Attempt ID") @PathVariable Long attemptId,
            @Valid @RequestBody ReportViolationRequest request) {

        log.info("Violation reported - attemptId: {}, type: {}", attemptId, request.getViolationType());
        ViolationResponseDTO response = proctoringService.reportViolationForCurrentUser(attemptId, request);
        return ResponseEntity.ok(response);
    }
}
