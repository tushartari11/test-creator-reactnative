package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for submitting a guest answer.
 * Uses option ID instead of option number for easier frontend integration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request from the guest to start the test ")
public class GuestStartRequest {

  @Schema(description = "The name of the Guest", example = "John Doe")
  private String guestName;

}