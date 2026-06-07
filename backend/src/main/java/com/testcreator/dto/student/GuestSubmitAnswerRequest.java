package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for submitting a guest answer. Uses option ID instead of option number for easier
 * frontend integration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to submit a guest answer for a question")
public class GuestSubmitAnswerRequest {

  @NotNull(message = "Question ID is required")
  @Schema(description = "Question ID", example = "1")
  private Long questionId;

  @NotNull(message = "Selected option ID is required")
  @Schema(description = "Selected option ID (database ID)", example = "5")
  private Long selectedOptionId;
}
