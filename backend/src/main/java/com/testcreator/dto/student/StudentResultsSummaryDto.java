package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for the student results summary returned by GET /student/results. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(
    name = "StudentResultsSummary",
    description = "Aggregated results summary for a student")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class StudentResultsSummaryDto {

  @Schema(description = "List of all test results")
  private List<StudentResultSummaryDto> results;

  @Schema(description = "Total number of completed attempts", example = "5")
  private int totalAttempts;

  @Schema(description = "Average score across all attempts", example = "72.5")
  private double averageScore;

  @Schema(description = "Number of passing attempts", example = "3")
  private int passCount;

  @Schema(description = "Number of failing attempts", example = "2")
  private int failCount;
}
