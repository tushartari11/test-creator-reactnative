package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for test result summary in results list.
 *
 * <p>
 * Displays brief result information for quick scanning
 * in student's results history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "StudentResultSummary", description = "Brief test result for student results listing")
public class StudentResultSummaryDTO {

    @Schema(description = "Attempt ID", example = "123")
    private Long attemptId;

    @Schema(description = "Test ID", example = "45")
    private Long testId;

    @Schema(description = "Test title", example = "Java Fundamentals Quiz")
    private String testTitle;

    @Schema(description = "Score as percentage", example = "85.50", minimum = "0", maximum = "100")
    private Double score;

    @Schema(description = "Result status", example = "PASS", allowableValues = { "PASS", "FAIL" })
    private String result;

    @Schema(description = "When test was submitted", example = "2024-12-15T12:30:00")
    private LocalDateTime submittedAt;
}
