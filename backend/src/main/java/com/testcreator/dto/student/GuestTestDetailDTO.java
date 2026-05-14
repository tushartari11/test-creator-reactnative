package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for guest test details display.
 *
 * <p>
 * Shows test information for guests before starting attempt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "GuestTestDetail", description = "Test details for guest access")
public class GuestTestDetailDTO {

    @Schema(description = "Guest token", example = "guest_123e4567-e89b-12d3-a456-426614174000")
    private String guestToken;

    @Schema(description = "Test ID", example = "1")
    private Long testId;

    @Schema(description = "Test title", example = "Java Fundamentals Quiz")
    private String title;

    @Schema(description = "Test description", example = "Basic Java concepts and syntax")
    private String description;

    @Schema(description = "Total number of questions", example = "10")
    private Integer totalQuestions;

    @Schema(description = "Duration in minutes", example = "30")
    private Integer durationMinutes;

    @Schema(description = "Passing score percentage", example = "70")
    private Integer passingScore;
}
