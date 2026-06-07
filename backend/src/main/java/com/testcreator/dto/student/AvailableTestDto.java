package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for available tests shown to students.
 *
 * <p>Contains basic test information for students to browse and select tests.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Available test for student to attempt")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class AvailableTestDto {

  @Schema(description = "Test ID", example = "1")
  private Long id;

  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String title;

  @Schema(description = "Test description", example = "Test covering Java basics")
  private String description;

  @Schema(description = "Total number of questions", example = "10")
  private Integer totalQuestions;

  @Schema(description = "Test duration in minutes", example = "30")
  private Integer durationMinutes;

  @Schema(description = "Passing score percentage", example = "70")
  private Integer passingScore;

  @Schema(description = "Test date/time", example = "2026-02-20T10:00:00Z")
  private LocalDateTime testDate;

  @Schema(description = "Teacher name who created this test", example = "John Teacher")
  private String teacherName;

  @Schema(description = "Whether student has already attempted this test", example = "false")
  private Boolean alreadyAttempted;

  @Schema(description = "Student's previous score if attempted", example = "85")
  private Integer previousScore;

  @Schema(description = "Result of previous attempt (PASS/FAIL)", example = "PASS")
  private String previousResult;
}
