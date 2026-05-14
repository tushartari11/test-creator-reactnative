package com.testcreator.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating or updating a test.
 *
 * <p>
 * Used in POST and PUT endpoints for test management.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for creating or updating a test")
public class CreateTestRequest {

  @NotBlank(message = "Title is required")
  @Size(min = 5, max = 500, message = "Title must be between 5 and 500 characters")
  @Schema(description = "Test title", example = "Java Fundamentals Quiz")
  private String title;

  @NotBlank(message = "Description is required")
  @Schema(description = "Test description", example = "Test covering Java basics")
  private String description;

  @NotNull(message = "Total questions count is required")
  @Min(value = 1, message = "At least 1 question is required")
  @Max(value = 100, message = "Maximum 100 questions allowed")
  @Schema(description = "Total number of questions", example = "10")
  private Integer totalQuestions;

  @NotNull(message = "Passing score is required")
  @Min(value = 0, message = "Passing score cannot be negative")
  @Max(value = 100, message = "Passing score cannot exceed 100")
  @Schema(description = "Passing score percentage", example = "70")
  private Integer passingScore;

  @NotNull(message = "Duration is required")
  @Min(value = 5, message = "Minimum duration is 5 minutes")
  @Max(value = 240, message = "Maximum duration is 240 minutes (4 hours)")
  @Schema(description = "Test duration in minutes", example = "30")
  private Integer durationMinutes;

  @Schema(description = "Date and time when test is scheduled", example = "2026-02-20T10:00:00Z")
  private String testDate;

  @Valid
  @NotEmpty(message = "At least one question is required")
  @Schema(description = "List of questions in the test")
  private List<QuestionRequest> questions;
}
