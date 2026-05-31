package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a question shown during test.
 *
 * <p>Contains question and options but not the correct answer (that's revealed after submission).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Question with options for student to answer")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class QuestionWithOptionsDto {

  @Schema(description = "Question ID", example = "1")
  private Long id;

  @Schema(description = "Question sequence number", example = "1")
  private Integer questionNumber;

  @Schema(description = "Question text", example = "What is Java?")
  private String questionText;

  @Schema(description = "Answer options available")
  private List<OptionDto> options;

  /** Nested option DTO. */
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  @Schema(description = "Answer option")
  public static class OptionDto {
    @Schema(description = "Option ID", example = "1")
    private Long id;

    @Schema(description = "Option sequence number (1-3)", example = "1")
    private Integer optionNumber;

    @Schema(description = "Option text", example = "A programming language")
    private String optionText;
  }
}
