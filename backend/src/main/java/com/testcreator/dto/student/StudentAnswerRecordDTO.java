package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a student's recorded answer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Student's recorded answer for a question")
public class StudentAnswerRecordDTO {

    @Schema(description = "Answer ID", example = "501")
    private Long id;

    @Schema(description = "Question ID", example = "1")
    private Long questionId;

  @Schema(description = "Selected option number (1-3)", example = "1")
    private Integer selectedOption;

    @Schema(description = "When answer was submitted", example = "2026-02-20T10:10:00Z")
    private LocalDateTime submittedAt;

    @Schema(description = "Is this answer correct (only after submission)", example = "true")
    private Boolean isCorrect;
}
