package com.testcreator.dto.proctoring;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response DTO when a violation is reported. Contains action instructions for the frontend. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response after reporting a violation")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class ViolationResponseDto {

  @Schema(description = "Violation was recorded", example = "true")
  private Boolean recorded;

  @Schema(
      description = "Warning message to display to student",
      example = "Tab switching detected. Please stay on the test page.")
  private String warningMessage;

  @Schema(description = "Total violation count for this attempt", example = "3")
  private Long totalViolations;

  @Schema(description = "Critical violation count", example = "0")
  private Long criticalViolations;

  @Schema(
      description = "Whether test should be auto-submitted due to violations",
      example = "false")
  private Boolean forceSubmit;

  @Schema(
      description = "Reason for force submit (if applicable)",
      example = "Too many critical violations")
  private String forceSubmitReason;

  @Schema(description = "Whether a warning should be shown to the user", example = "true")
  private Boolean showWarning;

  @Schema(description = "Remaining attempts before auto-submit (if threshold-based)", example = "2")
  private Integer remainingAttempts;

  /** Creates a simple acknowledgment response. */
  public static ViolationResponseDTO acknowledged() {
    return ViolationResponseDTO.builder()
        .recorded(true)
        .showWarning(false)
        .forceSubmit(false)
        .build();
  }

  /** Creates a warning response. */
  public static ViolationResponseDTO warning(
      String message, long totalViolations, int remainingAttempts) {
    return ViolationResponseDTO.builder()
        .recorded(true)
        .showWarning(true)
        .warningMessage(message)
        .totalViolations(totalViolations)
        .forceSubmit(false)
        .remainingAttempts(remainingAttempts)
        .build();
  }

  /** Creates a force submit response. */
  public static ViolationResponseDTO forceSubmit(
      String reason, long totalViolations, long criticalViolations) {
    return ViolationResponseDTO.builder()
        .recorded(true)
        .showWarning(true)
        .warningMessage("Your test is being submitted due to proctoring violations.")
        .forceSubmit(true)
        .forceSubmitReason(reason)
        .totalViolations(totalViolations)
        .criticalViolations(criticalViolations)
        .build();
  }
}
