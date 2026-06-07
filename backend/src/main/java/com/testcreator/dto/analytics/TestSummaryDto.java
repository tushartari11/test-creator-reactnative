package com.testcreator.dto.analytics;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for test summary in the teacher's test list view. Shows quick analytics for each test. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Test summary with quick analytics for teachers")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestSummaryDto {

  @Schema(description = "Test ID", example = "1")
  private Long testId;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String testTitle;

  @Schema(description = "Test status", example = "PUBLISHED")
  private String status;

  @Schema(description = "Total questions", example = "20")
  private Integer totalQuestions;

  @Schema(description = "Duration in minutes", example = "30")
  private Integer durationMinutes;

  @Schema(description = "Passing score", example = "70")
  private Integer passingScore;

  @Schema(description = "Total attempts", example = "50")
  private Integer totalAttempts;

  @Schema(description = "Completed attempts", example = "45")
  private Integer completedAttempts;

  @Schema(description = "Average score", example = "72.5")
  private Double averageScore;

  @Schema(description = "Pass rate percentage", example = "77.8")
  private Double passRate;

  @Schema(description = "Scheduled test date", example = "2026-02-15T14:00:00")
  private LocalDateTime testDate;

  @Schema(description = "When test was created", example = "2026-02-01T10:00:00")
  private LocalDateTime createdAt;
}
