package com.testcreator.testsupport.dto;

import com.testcreator.entity.Role;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Test support DTOs for integration testing and scenario creation. */
public final class TestSupportDtos {
  private TestSupportDtos() {}

  /** Response from creating a test scenario. */
  public record CreateScenarioResponse(UUID scenarioId, Instant createdAt) {}

  /** Request to create a test user. */
  public record CreateUserRequest(String email, String name, String password) {}

  /** Response from creating a test user. */
  public record CreateUserResponse(Long id, String email, String name, Role role, String jwt) {}

  /** Question seed data for test creation. */
  public record QuestionSeed(
      String questionText,
      List<String> options, // exactly 3 entries
      Integer correctOptionNumber // 1-based, in [1,3]
  ) {}

  /** Request to create a test. */
  public record CreateTestRequest(
      Long teacherId,
      String title,
      Integer durationMinutes,
      Integer passingScore,
      Boolean publish,
      Boolean generateAccessCode,
      List<QuestionSeed> questions // null → 3 default questions
  ) {}

  /** Descriptor for a question in a created test. */
  public record QuestionDescriptor(Long questionId, Integer questionNumber, List<Long> optionIds) {}

  /** Response from creating a test. */
  public record CreateTestResponse(
      Long testId,
      String title,
      String accessCode,
      LocalDateTime testDate,
      List<QuestionDescriptor> questions) {}

  /** Request to create guest access to a test. */
  public record CreateGuestAccessRequest(Long testId, Integer expiresInHours) {}

  /** Response from creating guest access. */
  public record CreateGuestAccessResponse(
      Long guestSessionId, String guestToken, LocalDateTime expiresAt, String accessCode) {}

  /** Request to login as a specific user. */
  public record LoginAsRequest(Long userId) {}

  /** Response from login request. */
  public record LoginAsResponse(String jwt, Role role) {}

  /** Health check response. */
  public record HealthResponse(
      String status, int activeScenarios, String dbName, String redisDb, boolean enabled) {}
}
