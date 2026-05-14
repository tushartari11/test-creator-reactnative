package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for submitting an answer to a question.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to submit an answer for a question")
public class SubmitAnswerRequest {

    @NotNull(message = "Question ID is required")
    @Schema(description = "Question ID", example = "1")
    private Long questionId;

    @NotNull(message = "Selected option is required")
    @Min(value = 1, message = "Option must be between 1 and 3")
    @Max(value = 3, message = "Option must be between 1 and 3")
    @Schema(description = "Selected option number (1-3)", example = "1")
    private Integer selectedOption;
}
