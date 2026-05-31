package com.testcreator.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for test response data.
 *
 * <p>Returned in GET endpoints for test management.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Test data in response")
@java.lang.SuppressWarnings("checkstyle:AbbreviationAsWordInName")
public class TestDto {

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

  @Schema(description = "Creator user information")
  private UserInfo createdBy;

  @Schema(description = "Creation timestamp", example = "2026-02-11T10:00:00Z")
  private LocalDateTime createdAt;

  @Schema(description = "Last modification timestamp", example = "2026-02-11T10:00:00Z")
  private LocalDateTime updatedAt;

  @Schema(description = "Number of attempts by students", example = "15")
  private Long attemptCount;

  /** Nested user information for test creator. */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "User information (simplified)")
  public static class UserInfo {
    @Schema(description = "User ID", example = "1")
    private Long id;

    @Schema(description = "User name", example = "John Teacher")
    private String name;

    @Schema(description = "User email", example = "teacher@example.com")
    private String email;
  }
}
// CHECKSTYLE:ON AbbreviationAsWordInName
