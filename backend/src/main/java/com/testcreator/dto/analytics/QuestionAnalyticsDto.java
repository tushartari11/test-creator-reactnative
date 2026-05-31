package com.testcreator.dto.analytics;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO containing analytics for a single question. Shows how students performed on each question.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Analytics for a single question")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class QuestionAnalyticsDto {

  @Schema(description = "Question ID", example = "1")
  private Long questionId;

  @Schema(description = "Question number in test", example = "5")
  private Integer questionNumber;

  @Schema(description = "Question text (truncated)", example = "What is the purpose of...")
  private String questionText;

  @Schema(description = "Correct option number", example = "2")
  private Integer correctOption;

  @Schema(description = "Number of correct answers", example = "35")
  private Integer correctCount;

  @Schema(description = "Number of wrong answers", example = "10")
  private Integer wrongCount;

  @Schema(description = "Number of skipped (no answer)", example = "5")
  private Integer skippedCount;

  @Schema(description = "Percentage of students who got it correct", example = "70.0")
  private Double correctPercentage;

  @Schema(
      description = "Distribution of answers by option number",
      example = "{\"1\": 10, \"2\": 35, \"3\": 5}")
  private Map<Integer, Integer> answerDistribution;

  @Schema(description = "Difficulty rating (based on correct percentage)", example = "MEDIUM")
  private String difficulty;

  /** Calculates difficulty based on correct percentage. */
  public static String calculateDifficulty(double correctPercentage) {
    if (correctPercentage >= 80) {
      return "EASY";
    }
    if (correctPercentage >= 50) {
      return "MEDIUM";
    }
    if (correctPercentage >= 25) {
      return "HARD";
    }
    return "VERY_HARD";
  }
}
