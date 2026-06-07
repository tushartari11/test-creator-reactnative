package com.testcreator.dto.proctoring;

import com.testcreator.entity.ViolationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary DTO for proctoring violations of an attempt. Used for teacher analytics and reporting.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Summary of proctoring violations for an attempt")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class ViolationSummaryDto {

  @Schema(description = "Test attempt ID", example = "123")
  private Long attemptId;

  @Schema(description = "Student name", example = "John Doe")
  private String studentName;

  @Schema(description = "Student email", example = "john@example.com")
  private String studentEmail;

  @Schema(description = "Total number of violations", example = "5")
  private Long totalViolations;

  @Schema(description = "Count of critical violations", example = "0")
  private Long criticalCount;

  @Schema(description = "Count of high severity violations", example = "1")
  private Long highCount;

  @Schema(description = "Count of medium severity violations", example = "3")
  private Long mediumCount;

  @Schema(description = "Count of low severity violations", example = "1")
  private Long lowCount;

  @Schema(description = "Breakdown by violation type")
  private Map<ViolationType, Long> violationsByType;

  @Schema(description = "Whether honor was preserved (no critical violations)", example = "true")
  private Boolean honorPreserved;

  @Schema(description = "List of all violations (optional, for detailed view)")
  private List<ViolationDto> violations;

  /** Checks if honor was preserved (no critical violations). */
  public Boolean getHonorPreserved() {
    return criticalCount == null || criticalCount == 0;
  }
}
