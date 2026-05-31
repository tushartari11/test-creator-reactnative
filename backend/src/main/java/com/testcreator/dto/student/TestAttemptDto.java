package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for test attempt in progress.
 *
 * <p>Contains questions and current progress for an active test attempt.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Active test attempt with questions")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestAttemptDto {
  @Schema(description = "Guest name (if guest attempt)", example = "Tushar Tari")
  private String guestName;

  @Schema(description = "Test result summary and review")
  private TestResultDTO result;

  @Schema(description = "Attempt ID", example = "101")
  private Long id;

  @Schema(description = "Test ID", example = "1")
  private Long testId;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String testTitle;

  @Schema(description = "Student ID", example = "5")
  private Long studentId;

  @Schema(description = "When attempt started", example = "2026-02-20T10:05:00Z")
  private LocalDateTime startedAt;

  @Schema(description = "When attempt expires", example = "2026-02-20T10:35:00Z")
  private LocalDateTime expiresAt;

  @Schema(description = "Remaining minutes in the test", example = "25")
  private Integer remainingMinutes;

  @Schema(description = "Total number of questions", example = "10")
  private Integer totalQuestions;

  @Schema(description = "Number of questions answered", example = "5")
  private Integer answeredQuestions;

  @Schema(description = "Current attempt status", example = "IN_PROGRESS")
  private String status;

  @Schema(description = "Whether test has been submitted", example = "false")
  private Boolean submitted;

  @Schema(description = "Questions to answer")
  private List<QuestionWithOptionsDTO> questions;

  @Schema(description = "Student's answers so far")
  private List<StudentAnswerRecordDTO> answers;
}
