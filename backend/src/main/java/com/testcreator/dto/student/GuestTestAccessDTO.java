package com.testcreator.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for guest test access link generation.
 *
 * <p>
 * Contains guest session token to access test without authentication.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "GuestTestAccess", description = "Guest test access token and details")
public class GuestTestAccessDTO {

    @Schema(description = "Guest session token", example = "guest_123e4567-e89b-12d3-a456-426614174000")
    private String guestToken;

    @Schema(description = "Test ID", example = "1")
    private Long testId;

    @Schema(description = "Test title", example = "Java Fundamentals")
    private String testTitle;

    @Schema(description = "Guest access URL", example = "http://app.com/guest-test/guest_123e4567-e89b-12d3-a456-426614174000")
    private String guestAccessUrl;

    @Schema(description = "Expiration time in minutes", example = "1440")
    private Integer expirationMinutes;
}
