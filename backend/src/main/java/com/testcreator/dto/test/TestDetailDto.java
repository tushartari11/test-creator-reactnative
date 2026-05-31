package com.testcreator.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for detailed test information with questions and options. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Detailed test information including questions")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestDetailDto {

  @Schema(description = "Test ID", example = "1")
  private Long id;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String title;

  @Schema(description = "Test description", example = "Test covering Java basics")
  private String description;

  @Schema(description = "Total number of questions", example = "10")
  private Integer totalQuestions;

  @Schema(description = "Passing score percentage", example = "70")
  private Integer passingScore;

  @Schema(description = "Test duration in minutes", example = "30")
  private Integer durationMinutes;

  @Schema(description = "Test status", example = "PUBLISHED")
  private String status;

  @Schema(description = "Guest access code", example = "guest_a3f2b1")
  private String accessCode;

  @Schema(description = "Test date", example = "2026-02-20T10:00:00Z")
  private LocalDateTime testDate;

  @Schema(description = "Question list")
  private List<QuestionDetailDto> questions;

  @Schema(description = "Creator user information")
  private UserInfo createdBy;

  @Schema(description = "Creation timestamp", example = "2026-02-11T10:00:00Z")
  private LocalDateTime createdAt;

  @Schema(description = "Last modification timestamp", example = "2026-02-11T10:00:00Z")
  private LocalDateTime updatedAt;

  /** Nested question detail DTO. */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Question with options and explanation")
  public static class QuestionDetailDto {
    @Schema(description = "Question ID", example = "1")
    private Long id;

    @Schema(description = "Question sequence number", example = "1")
    private Integer questionNumber;

    @Schema(description = "Question text", example = "What is Java?")
    private String questionText;

    @Schema(
        description = "Explanation for correct answer",
        example = "Java is a programming language.")
    private String explanation;

    @Schema(description = "Correct option number (1-3)", example = "1")
    private Integer correctOptionNumber;

    @Schema(description = "Answer options")
    private List<OptionDto> options;
  }

  /** Nested option DTO. */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Answer option")
  public static class OptionDto {
    @Schema(description = "Option ID", example = "1")
    private Long id;

    @Schema(description = "Option sequence number (1-3)", example = "1")
    private Integer optionNumber;

    @Schema(description = "Option text", example = "A programming language")
    private String optionText;
  }

  /** Nested user information DTO. */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "User information")
  public static class UserInfo {
    @Schema(description = "User ID", example = "1")
    private Long id;

    @Schema(description = "User name", example = "John Teacher")
    private String name;

    @Schema(description = "User email", example = "teacher@example.com")
    private String email;
  }
}
