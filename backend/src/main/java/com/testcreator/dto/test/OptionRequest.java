package com.testcreator.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for answer options. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Answer option for a question")
public class OptionRequest {

  @NotNull(message = "Option number is required")
  @Min(value = 1, message = "Option number must be between 1 and 3")
  @Max(value = 3, message = "Option number must be between 1 and 3")
  @Schema(description = "Option sequence number (1-3)", example = "1")
  private Integer optionNumber;

  @NotBlank(message = "Option text is required")
  @Size(min = 1, max = 500, message = "Option text must be between 1 and 500 characters")
  @Schema(description = "The option text", example = "A programming language")
  private String optionText;
}
