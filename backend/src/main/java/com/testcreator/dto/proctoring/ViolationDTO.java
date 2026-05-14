package com.testcreator.dto.proctoring;

import com.testcreator.entity.ViolationSeverity;
import com.testcreator.entity.ViolationType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO representing a proctoring violation record.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Proctoring violation record")
public class ViolationDTO {

    @Schema(description = "Violation ID", example = "1")
    private Long id;

    @Schema(description = "Test attempt ID", example = "123")
    private Long attemptId;

    @Schema(description = "Type of violation", example = "TAB_SWITCH")
    private ViolationType violationType;

    @Schema(description = "Severity level", example = "MEDIUM")
    private ViolationSeverity severity;

    @Schema(description = "Human-readable message", example = "User switched to another tab")
    private String message;

    @Schema(description = "Additional details (JSON)")
    private Map<String, Object> details;

    @Schema(description = "When violation occurred (client time)", example = "2026-02-12T10:30:00")
    private LocalDateTime clientTimestamp;

    @Schema(description = "When violation was recorded (server time)", example = "2026-02-12T10:30:01")
    private LocalDateTime createdAt;
}
