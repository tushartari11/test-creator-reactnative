package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for test result after submission.
 *
 * <p>
 * Contains scored results with correct answers revealed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Test result after submission")
public class TestResultDTO {

  @Schema(description = "Attempt ID", example = "101")
  private Long attemptId;

  @Schema(description = "Test ID", example = "1")
  private Long testId;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String testTitle;

  @Schema(description = "Total questions", example = "10")
  private Integer totalQuestions;

  @Schema(description = "Questions answered", example = "10")
  private Integer answeredQuestions;

  @Schema(description = "Correct answers", example = "8")
  private Integer correctAnswers;

  @Schema(description = "Wrong answers", example = "2")
  private Integer wrongAnswers;

  @Schema(description = "Skipped questions", example = "0")
  private Integer skippedQuestions;

  @Schema(description = "Score percentage", example = "80.0")
  private Double score;

  @Schema(description = "Pass/Fail result", example = "PASS")
  private String result;

  @Schema(description = "Passing score required", example = "70")
  private Integer passingScore;

  @Schema(description = "When test was submitted", example = "2026-02-20T10:30:00Z")
  private LocalDateTime submittedAt;

  @Schema(description = "Time taken in seconds", example = "1500")
  private Integer timeTakenSeconds;

  @Schema(description = "Questions with answers revealed")
  private List<ReviewQuestionDTO> reviewQuestions;

  /**
   * Nested review question DTO with answers revealed.
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Question with answer revealed")
  public static class ReviewQuestionDTO {

    @Schema(description = "Question ID", example = "1")
    private Long id;

    @Schema(description = "Question number", example = "1")
    private Integer questionNumber;

    @Schema(description = "Question text", example = "What is Java?")
    private String questionText;

    @Schema(description = "Explanation why this is correct", example = "Java is a programming language and computing platform")
    private String explanation;

    @Schema(description = "Correct option number", example = "1")
    private Integer correctOption;

    @Schema(description = "Student's selected option", example = "1")
    private Integer selectedOption;

    @Schema(description = "Was student's answer correct", example = "true")
    private Boolean isCorrect;

    @Schema(description = "All options with correctness marked")
    private List<ReviewOptionDTO> options;
  }

  /**
   * Option with correctness indicator.
   */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Option with answer status")
  public static class ReviewOptionDTO {

    @Schema(description = "Option number", example = "1")
    private Integer optionNumber;

    @Schema(description = "Option text", example = "A programming language")
    private String optionText;

    @Schema(description = "Is this the correct answer", example = "true")
    private Boolean isCorrect;

    @Schema(description = "Did student select this", example = "true")
    private Boolean wasSelected;
  }
}
