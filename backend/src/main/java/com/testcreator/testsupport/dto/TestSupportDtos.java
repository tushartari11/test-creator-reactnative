package com.testcreator.testsupport.dto;

import com.testcreator.entity.Role;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class TestSupportDtos {
    private TestSupportDtos() {}

    public record CreateScenarioResponse(UUID scenarioId, Instant createdAt) {}

    public record CreateUserRequest(String email, String name, String password) {}

    public record CreateUserResponse(Long id, String email, String name, Role role, String jwt) {}

    public record QuestionSeed(
        String questionText,
        List<String> options,           // exactly 3 entries
        Integer correctOptionNumber     // 1-based, in [1,3]
    ) {}

    public record CreateTestRequest(
        Long teacherId,
        String title,
        Integer durationMinutes,
        Integer passingScore,
        Boolean publish,
        Boolean generateAccessCode,
        List<QuestionSeed> questions    // null → 3 default questions
    ) {}

    public record QuestionDescriptor(Long questionId, Integer questionNumber, List<Long> optionIds) {}

    public record CreateTestResponse(
        Long testId,
        String title,
        String accessCode,
        LocalDateTime testDate,
        List<QuestionDescriptor> questions
    ) {}

    public record CreateGuestAccessRequest(Long testId, Integer expiresInHours) {}

    public record CreateGuestAccessResponse(
        Long guestSessionId,
        String guestToken,
        LocalDateTime expiresAt,
        String accessCode
    ) {}

    public record LoginAsRequest(Long userId) {}

    public record LoginAsResponse(String jwt, Role role) {}

    public record HealthResponse(
        String status,
        int activeScenarios,
        String dbName,
        String redisDb,
        boolean enabled
    ) {}
}
