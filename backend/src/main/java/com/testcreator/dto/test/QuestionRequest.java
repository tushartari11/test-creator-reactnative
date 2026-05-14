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
 * DTO for creating/updating a question within a test.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Question data for test creation")
public class QuestionRequest {

    @NotNull(message = "Question number is required")
    @Min(value = 1, message = "Question number must be at least 1")
    @Schema(description = "Question sequence number", example = "1")
    private Integer questionNumber;

    @NotBlank(message = "Question text is required")
    @Schema(description = "The question text", example = "What is Java?")
    private String questionText;

    @NotBlank(message = "Explanation is required")
    @Schema(description = "Explanation for the correct answer", example = "Java is a programming language and computing platform.")
    private String explanation;

    @NotNull(message = "Correct option number is required")
    @Min(value = 1, message = "Correct option must be between 1 and 3")
    @Max(value = 3, message = "Correct option must be between 1 and 3")
    @Schema(description = "The option number that is correct (1-3)", example = "1")
    private Integer correctOptionNumber;

    @Valid
    @NotEmpty(message = "At least one option is required")
    @Size(min = 3, max = 3, message = "Exactly 3 options are required")
    @Schema(description = "List of answer options (exactly 3)")
    private List<OptionRequest> options;
}
