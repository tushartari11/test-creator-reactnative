package com.testcreator.dto.analytics;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO containing comprehensive analytics for a test. Used by teachers to view test performance and
 * student results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Comprehensive test analytics for teachers")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestAnalyticsDto {

  @Schema(description = "Test ID", example = "1")
  private Long testId;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String testTitle;

  @Schema(description = "Test status", example = "PUBLISHED")
  private String status;

  @Schema(description = "Total number of attempts", example = "50")
  private Integer totalAttempts;

  @Schema(description = "Number of completed attempts", example = "45")
  private Integer completedAttempts;

  @Schema(description = "Number of in-progress attempts", example = "5")
  private Integer inProgressAttempts;

  @Schema(description = "Average score percentage", example = "72.5")
  private Double averageScore;

  @Schema(description = "Median score percentage", example = "75.0")
  private Double medianScore;

  @Schema(description = "Highest score achieved", example = "100.0")
  private Double highestScore;

  @Schema(description = "Lowest score achieved", example = "20.0")
  private Double lowestScore;

  @Schema(description = "Standard deviation of scores", example = "15.3")
  private Double standardDeviation;

  @Schema(description = "Number of students who passed", example = "35")
  private Integer passCount;

  @Schema(description = "Number of students who failed", example = "10")
  private Integer failCount;

  @Schema(description = "Pass rate percentage", example = "77.8")
  private Double passRate;

  @Schema(description = "Passing score threshold", example = "70")
  private Integer passingScore;

  @Schema(description = "Total questions in test", example = "20")
  private Integer totalQuestions;

  @Schema(description = "Test duration in minutes", example = "30")
  private Integer durationMinutes;

  @Schema(description = "Average time taken in seconds", example = "1200")
  private Long averageTimeTaken;

  @Schema(description = "Score distribution by ranges (0-10, 10-20, etc.)")
  private Map<String, Integer> scoreDistribution;

  @Schema(description = "Per-question analytics")
  private List<QuestionAnalyticsDTO> questionAnalytics;

  @Schema(description = "Individual student results")
  private List<StudentAttemptSummaryDTO> studentResults;

  @Schema(description = "Students with proctoring violations")
  private Integer studentsWithViolations;

  @Schema(description = "Total proctoring violations across all attempts", example = "15")
  private Long totalViolations;

  @Schema(description = "Test creation date", example = "2026-02-01T10:00:00")
  private LocalDateTime createdAt;

  @Schema(description = "Test scheduled date", example = "2026-02-15T14:00:00")
  private LocalDateTime testDate;
}
