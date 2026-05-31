package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for cached answer data in Redis.
 *
 * <p>Lightweight representation of student answer for fast caching.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "CachedAnswer", description = "Cached answer data for auto-save")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class CachedAnswerDto implements Serializable {

  private static final long serialVersionUID = 1L;

  @Schema(description = "Attempt ID", example = "123")
  private Long attemptId;

  @Schema(description = "Question ID", example = "456")
  private Long questionId;

  @Schema(description = "Selected option (1-3)", example = "2")
  private Integer selectedOption;

  @Schema(description = "When answer was cached", example = "2024-12-15T12:30:00")
  private LocalDateTime cachedAt;

  @Schema(description = "Whether synced to database", example = "false")
  private Boolean syncedToDb;
}
