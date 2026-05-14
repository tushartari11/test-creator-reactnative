package com.testcreator.dto.proctoring;

import com.testcreator.entity.ViolationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Request DTO for reporting a proctoring violation from the frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to report a proctoring violation")
public class ReportViolationRequest {

    @NotNull(message = "Violation type is required")
    @Schema(description = "Type of violation detected", example = "TAB_SWITCH", required = true)
    private ViolationType violationType;

    @Schema(description = "Human-readable message about the violation", example = "User switched to another tab")
    private String message;

    @Schema(description = "Additional details about the violation (JSON object)")
    private Map<String, Object> details;

    @Schema(description = "Timestamp from the client when violation occurred", example = "2026-02-12T10:30:00")
    private LocalDateTime clientTimestamp;
}
