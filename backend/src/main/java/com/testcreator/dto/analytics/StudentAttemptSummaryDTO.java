package com.testcreator.dto.analytics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO containing a student's attempt summary for teacher analytics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Student attempt summary for teacher view")
public class StudentAttemptSummaryDTO {

    @Schema(description = "Attempt ID", example = "123")
    private Long attemptId;

    @Schema(description = "Student ID (null for guest)", example = "45")
    private Long studentId;

    @Schema(description = "Student name", example = "John Doe")
    private String studentName;

    @Schema(description = "Student email", example = "john@example.com")
    private String studentEmail;

    @Schema(description = "Whether this was a guest attempt", example = "false")
    private Boolean isGuest;

    @Schema(description = "Score as percentage", example = "85.5")
    private Double score;

    @Schema(description = "Number of correct answers", example = "17")
    private Integer correctAnswers;

    @Schema(description = "Number of wrong answers", example = "2")
    private Integer wrongAnswers;

    @Schema(description = "Number of skipped questions", example = "1")
    private Integer skippedAnswers;

    @Schema(description = "Result status", example = "PASS")
    private String result;

    @Schema(description = "Attempt status", example = "SUBMITTED")
    private String status;

    @Schema(description = "When the attempt started", example = "2026-02-12T14:00:00")
    private LocalDateTime startedAt;

    @Schema(description = "When the test was submitted", example = "2026-02-12T14:25:00")
    private LocalDateTime submittedAt;

    @Schema(description = "Time taken in seconds", example = "1500")
    private Long timeTakenSeconds;

    @Schema(description = "Number of proctoring violations", example = "2")
    private Long violationCount;

    @Schema(description = "Whether critical violations occurred", example = "false")
    private Boolean hasCriticalViolations;

    @Schema(description = "Tab switch count", example = "3")
    private Integer tabSwitchCount;
}
