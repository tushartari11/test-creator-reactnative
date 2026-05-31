package com.testcreator.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for test list view (simplified without questions). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Test data for list view")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestListDto {

  @Schema(description = "Test ID", example = "1")
  private Long id;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String title;

  @Schema(description = "Total number of questions", example = "10")
  private Integer totalQuestions;

  @Schema(description = "Test date", example = "2026-02-20T10:00:00Z")
  private LocalDateTime testDate;

  @Schema(description = "Test status", example = "PUBLISHED")
  private String status;

  @Schema(description = "Guest access code", example = "guest_a3f2b1")
  private String accessCode;

  @Schema(description = "Creation timestamp", example = "2026-02-11T10:00:00Z")
  private LocalDateTime createdAt;

  @Schema(description = "Number of student attempts", example = "15")
  private Long attemptCount;
}
