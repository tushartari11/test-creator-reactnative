package com.testcreator.controller;

import com.testcreator.dto.test.*;
import com.testcreator.service.TestAttemptService;
import com.testcreator.service.TestService;
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
import org.springframework.web.multipart.MultipartFile;

/**
 * REST controller for test management.
 *
 * <p>
 * Handles CRUD operations for tests. Restricted to teachers.
 */
@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Test Management", description = "Test creation, management, and publishing (Teacher only)")
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasRole('TEACHER')")
public class TestController {

        private final TestService testService;
        private final TestAttemptService testAttemptService;

        /**
         * Imports questions from a CSV file and returns parsed questions for review.
         *
         * @param file     CSV file
         * @param testName Name of the test
         * @param duration Duration in minutes
         * @return ImportTestResponse with parsed questions and errors
         */
        @PostMapping("/import-csv")
        @Operation(summary = "Import questions from CSV", description = "Parses a CSV file and returns questions/options for review before saving.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "CSV parsed successfully"),
                        @ApiResponse(responseCode = "400", description = "Invalid CSV or parse error")
        })
        public ResponseEntity<ImportTestResponse> importTestFromCsv(
                        @RequestParam("file") MultipartFile file,
                        @RequestParam("testName") String testName,
                        @RequestParam("duration") Integer duration) {
                ImportTestResponse response = testService.importTestFromCsv(file, testName, duration);
                if (response.getErrors() != null && !response.getErrors().isEmpty()) {
                        return ResponseEntity.badRequest().body(response);
                }
                return ResponseEntity.ok(response);
        }

        /**
         * Creates a new test.
         *
         * @param request test creation request
         * @return created test with 201 status
         */
        @PostMapping
        @Operation(summary = "Create a new test", description = "Creates a new test with questions and options. Only accessible to teachers.")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Test created successfully", content = @Content(schema = @Schema(implementation = TestDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid input (validation error)"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Only teachers can create tests")
        })
        public ResponseEntity<TestDTO> createTest(@Valid @RequestBody CreateTestRequest request) {
                log.info("Create test request received: {}", request.getTitle());
                TestDTO testDTO = testService.createTest(request);
                return ResponseEntity.status(HttpStatus.CREATED).body(testDTO);
        }

        /**
         * Retrieves all tests created by the current teacher.
         *
         * @param page      page number (default 0)
         * @param size      page size (default 10)
         * @param status    optional status filter
         * @param sort      sort field (default: createdAt)
         * @param direction sort direction (ASC or DESC)
         * @return page of tests
         */
        @GetMapping
        @Operation(summary = "Get all tests", description = "Retrieves all tests created by the authenticated teacher with pagination and filtering")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Tests retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<Page<TestListDTO>> getAllTests(
                        @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") @Min(0) int page,
                        @Parameter(description = "Page size (max 100)") @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size,
                        @Parameter(description = "Filter by status (DRAFT, PUBLISHED, ARCHIVED)") @RequestParam(required = false) String status,
                        @Parameter(description = "Sort field (title, testDate, createdAt)") @RequestParam(defaultValue = "createdAt") String sort,
                        @Parameter(description = "Sort direction (ASC, DESC)") @RequestParam(defaultValue = "DESC") String direction) {

                log.info("Get all tests request - page: {}, size: {}, status: {}", page, size, status);

                Sort.Direction sortDir = Sort.Direction.fromString(direction.toUpperCase());
                Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, sort));

                Page<TestListDTO> tests = testService.getAllTestsByTeacher(pageable, status);
                return ResponseEntity.ok(tests);
        }

        /**
         * Retrieves test details by ID.
         *
         * @param testId test ID
         * @return test details with questions and options
         */
        @GetMapping("/{testId}")
        @Operation(summary = "Get test details", description = "Retrieves detailed information about a test including all questions and options")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Test retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot access this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<TestDetailDTO> getTestById(
                        @Parameter(description = "Test ID") @PathVariable Long testId) {

                log.info("Get test details request - testId: {}", testId);
                TestDetailDTO testDetails = testService.getTestById(testId);
                return ResponseEntity.ok(testDetails);
        }

        /**
         * Updates an existing test.
         *
         * @param testId  test ID
         * @param request update request
         * @return updated test
         */
        @PutMapping("/{testId}")
        @Operation(summary = "Update a test", description = "Updates an existing test. Can only update tests in DRAFT status.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Test updated successfully"),
                        @ApiResponse(responseCode = "400", description = "Validation error or test not in DRAFT status"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot update this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<TestDTO> updateTest(
                        @Parameter(description = "Test ID") @PathVariable Long testId,
                        @Valid @RequestBody CreateTestRequest request) {

                log.info("Update test request - testId: {}", testId);
                TestDTO updatedTest = testService.updateTest(testId, request);
                return ResponseEntity.ok(updatedTest);
        }

        /**
         * Publishes a test (makes it available to students).
         *
         * @param testId test ID
         * @return updated test with PUBLISHED status
         */
        @PostMapping("/{testId}/publish")
        @Operation(summary = "Publish a test", description = "Publishes a test making it available for students to attempt. Can only publish DRAFT tests.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Test published successfully"),
                        @ApiResponse(responseCode = "400", description = "Test not in DRAFT status"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot publish this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<TestDTO> publishTest(
                        @Parameter(description = "Test ID") @PathVariable Long testId) {

                log.info("Publish test request - testId: {}", testId);
                TestDTO publishedTest = testService.publishTest(testId);
                return ResponseEntity.ok(publishedTest);
        }

        /**
         * Archives a test.
         *
         * @param testId test ID
         * @return updated test with ARCHIVED status
         */
        @PostMapping("/{testId}/archive")
        @Operation(summary = "Archive a test", description = "Archives a test removing it from active use but keeping records.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Test archived successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot archive this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<TestDTO> archiveTest(
                        @Parameter(description = "Test ID") @PathVariable Long testId) {

                log.info("Archive test request - testId: {}", testId);
                TestDTO archivedTest = testService.archiveTest(testId);
                return ResponseEntity.ok(archivedTest);
        }

        /**
         * Generates a guest access code for a test.
         *
         * @param testId test ID
         * @return updated test with generated access code
         */
        @PostMapping("/{testId}/access-code")
        @Operation(summary = "Generate access code", description = "Generates a guest access code for the test (format: guest_XXXXXX)")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Access code generated successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot modify this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<TestDTO> generateAccessCode(
                        @Parameter(description = "Test ID") @PathVariable Long testId) {

                log.info("Generate access code request - testId: {}", testId);
                TestDTO updatedTest = testService.generateAccessCode(testId);
                return ResponseEntity.ok(updatedTest);
        }

        /**
         * Deletes a test.
         *
         * @param testId test ID
         * @return 204 No Content
         */
        @DeleteMapping("/{testId}")
        @Operation(summary = "Delete a test", description = "Deletes a test. Can only delete tests with no student attempts.")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Test deleted successfully"),
                        @ApiResponse(responseCode = "400", description = "Test has attempts and cannot be deleted"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot delete this test"),
                        @ApiResponse(responseCode = "404", description = "Test not found")
        })
        public ResponseEntity<Void> deleteTest(
                        @Parameter(description = "Test ID") @PathVariable Long testId) {

                log.info("Delete test request - testId: {}", testId);
                testService.deleteTest(testId);
                return ResponseEntity.noContent().build();
        }

        /**
         * Resets a student's attempt for a test, allowing them to retake it.
         *
         * @param testId    test ID
         * @param studentId student user ID
         * @return 204 No Content
         */
        @DeleteMapping("/{testId}/students/{studentId}/attempt")
        @Operation(summary = "Reset student attempt", description = "Deletes a student's attempt for a test so they can retake it. Only the teacher who owns the test can do this.")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Attempt reset successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized"),
                        @ApiResponse(responseCode = "403", description = "Cannot reset attempt for this test"),
                        @ApiResponse(responseCode = "404", description = "Test or attempt not found")
        })
        public ResponseEntity<Void> resetStudentAttempt(
                        @Parameter(description = "Test ID") @PathVariable Long testId,
                        @Parameter(description = "Student user ID") @PathVariable Long studentId) {

                log.info("Reset attempt request - testId: {}, studentId: {}", testId, studentId);
                testAttemptService.resetStudentAttempt(testId, studentId);
                return ResponseEntity.noContent().build();
        }
}
