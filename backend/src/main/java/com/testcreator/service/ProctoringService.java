package com.testcreator.service;

import com.testcreator.dto.proctoring.ReportViolationRequest;
import com.testcreator.dto.proctoring.ViolationDto;
import com.testcreator.dto.proctoring.ViolationResponseDto;
import com.testcreator.dto.proctoring.ViolationSummaryDto;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.ProctoringViolation;
import com.testcreator.entity.TestAttempt;
import com.testcreator.entity.ViolationSeverity;
import com.testcreator.entity.ViolationType;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.ProctoringViolationRepository;
import com.testcreator.repository.TestAttemptRepository;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for handling proctoring violations during test attempts.
 *
 * <p>Manages violation recording, threshold checking, and analytics for maintaining test integrity.
 *
 * @see ProctoringViolation
 * @see ViolationType
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class ProctoringService {

  private final ProctoringViolationRepository violationRepository;
  private final TestAttemptRepository attemptRepository;
  private final TestAttemptService testAttemptService;

  /** Maximum violations before force-submit (configurable). */
  @Value("${proctoring.max-violations:10}")
  private int maxViolations;

  /** Maximum critical violations before force-submit. */
  @Value("${proctoring.max-critical-violations:3}")
  private int maxCriticalViolations;

  /** Maximum tab switches allowed. */
  @Value("${proctoring.max-tab-switches:5}")
  private int maxTabSwitches;

  /**
   * Records a proctoring violation with ownership validation.
   *
   * @param attemptId the test attempt ID
   * @param request the violation report request
   * @return response with action instructions for the frontend
   */
  public ViolationResponseDto reportViolationForCurrentUser(
      Long attemptId, ReportViolationRequest request) {
    // Validate that the current user owns this attempt
    testAttemptService.validateAndGetAttempt(attemptId);
    return recordViolation(attemptId, request);
  }

  /**
   * Records a proctoring violation and determines the response action.
   *
   * @param attemptId the test attempt ID
   * @param request the violation report request
   * @return response with action instructions for the frontend
   */
  public ViolationResponseDto recordViolation(Long attemptId, ReportViolationRequest request) {
    log.info("Recording violation: attemptId={}, type={}", attemptId, request.getViolationType());

    TestAttempt attempt =
        attemptRepository
            .findById(attemptId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Test attempt not found: " + attemptId));

    // Only record violations for in-progress attempts
    if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
      log.warn("Attempt {} is not in progress, ignoring violation", attemptId);
      return ViolationResponseDto.acknowledged();
    }

    // Determine severity
    ViolationSeverity severity =
        request.getDetails() != null && request.getDetails().containsKey("severity")
            ? ViolationSeverity.valueOf(request.getDetails().get("severity").toString())
            : ProctoringViolation.getDefaultSeverity(request.getViolationType());

    // Create and save violation
    ProctoringViolation violation =
        ProctoringViolation.builder()
            .attempt(attempt)
            .violationType(request.getViolationType())
            .severity(severity)
            .message(request.getMessage())
            .details(request.getDetails())
            .clientTimestamp(request.getClientTimestamp())
            .createdAt(LocalDateTime.now())
            .build();

    violationRepository.save(violation);

    // Update tab switch count on attempt if applicable
    if (request.getViolationType() == ViolationType.TAB_SWITCH) {
      attempt.setTabSwitchCount(attempt.getTabSwitchCount() + 1);
      attemptRepository.save(attempt);
    }

    // Get current violation counts
    long totalViolations = violationRepository.countByAttemptId(attemptId);
    long criticalViolations =
        violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.CRITICAL);
    long tabSwitches =
        violationRepository.countByAttemptIdAndViolationType(attemptId, ViolationType.TAB_SWITCH);

    // Check thresholds
    return checkThresholdsAndRespond(totalViolations, criticalViolations, tabSwitches, severity);
  }

  /** Checks violation thresholds and determines the response. */
  private ViolationResponseDto checkThresholdsAndRespond(
      long totalViolations, long criticalViolations, long tabSwitches, ViolationSeverity severity) {

    // Force submit if critical violations exceed threshold
    if (criticalViolations >= maxCriticalViolations) {
      log.warn("Critical violation threshold exceeded: {} critical violations", criticalViolations);
      return ViolationResponseDto.forceSubmit(
          "Too many critical violations detected", totalViolations, criticalViolations);
    }

    // Force submit if total violations exceed threshold
    if (totalViolations >= maxViolations) {
      log.warn("Total violation threshold exceeded: {} violations", totalViolations);
      return ViolationResponseDto.forceSubmit(
          "Maximum violation limit reached", totalViolations, criticalViolations);
    }

    // Warning for tab switches approaching limit
    if (tabSwitches >= maxTabSwitches - 1) {
      int remaining = (int) (maxTabSwitches - tabSwitches);
      return ViolationResponseDto.warning(
          "Warning: You have switched tabs "
              + tabSwitches
              + " times. "
              + "Your test will be auto-submitted after "
              + remaining
              + " more tab switches.",
          totalViolations,
          remaining);
    }

    // Warning for high/critical severity
    if (severity == ViolationSeverity.HIGH || severity == ViolationSeverity.CRITICAL) {
      int remaining = (int) (maxViolations - totalViolations);
      return ViolationResponseDto.warning(getWarningMessage(severity), totalViolations, remaining);
    }

    // Simple acknowledgment for low/medium violations
    return ViolationResponseDto.builder()
        .recorded(true)
        .showWarning(severity == ViolationSeverity.MEDIUM)
        .warningMessage(
            severity == ViolationSeverity.MEDIUM ? "Please stay focused on your test." : null)
        .totalViolations(totalViolations)
        .forceSubmit(false)
        .build();
  }

  /** Gets an appropriate warning message based on severity. */
  private String getWarningMessage(ViolationSeverity severity) {
    return switch (severity) {
      case CRITICAL ->
          "Critical violation detected! Continue violations will result in automatic submission.";
      case HIGH -> "Serious violation detected. Please adhere to test guidelines.";
      case MEDIUM -> "Please stay focused on your test and avoid suspicious activity.";
      case LOW -> "Minor issue detected. Please continue with your test.";
    };
  }

  /**
   * Gets all violations for an attempt.
   *
   * @param attemptId the attempt ID
   * @return list of violation DTOs
   */
  @Transactional(readOnly = true)
  public List<ViolationDto> getViolations(Long attemptId) {
    List<ProctoringViolation> violations =
        violationRepository.findAllByAttemptIdOrderByCreatedAtDesc(attemptId);
    return violations.stream().map(this::toDto).collect(Collectors.toList());
  }

  /**
   * Gets a summary of violations for an attempt.
   *
   * @param attemptId the attempt ID
   * @return violation summary DTO
   */
  @Transactional(readOnly = true)
  public ViolationSummaryDto getViolationSummary(Long attemptId) {
    TestAttempt attempt =
        attemptRepository
            .findById(attemptId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Test attempt not found: " + attemptId));

    long total = violationRepository.countByAttemptId(attemptId);
    long critical =
        violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.CRITICAL);
    long high = violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.HIGH);
    long medium =
        violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.MEDIUM);
    long low = violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.LOW);

    // Get counts by type
    Map<ViolationType, Long> byType = new EnumMap<>(ViolationType.class);
    List<Object[]> typeCounts = violationRepository.getViolationCountsByType(attemptId);
    for (Object[] row : typeCounts) {
      byType.put((ViolationType) row[0], (Long) row[1]);
    }

    return ViolationSummaryDto.builder()
        .attemptId(attemptId)
        .studentName(attempt.getStudent() != null ? attempt.getStudent().getName() : "Guest")
        .studentEmail(attempt.getStudent() != null ? attempt.getStudent().getEmail() : null)
        .totalViolations(total)
        .criticalCount(critical)
        .highCount(high)
        .mediumCount(medium)
        .lowCount(low)
        .violationsByType(byType)
        .build();
  }

  /**
   * Gets violation summaries for all attempts of a test (teacher view).
   *
   * @param testId the test ID
   * @return list of violation summaries
   */
  @Transactional(readOnly = true)
  public List<ViolationSummaryDto> getViolationSummariesForTest(Long testId) {
    List<Object[]> stats = violationRepository.getViolationStatsForTest(testId);

    return stats.stream()
        .map(
            row -> {
              Long attemptId = (Long) row[0];
              Long total = (Long) row[1];
              Long critical = ((Number) row[2]).longValue();

              TestAttempt attempt = attemptRepository.findById(attemptId).orElse(null);

              return ViolationSummaryDto.builder()
                  .attemptId(attemptId)
                  .studentName(
                      attempt != null && attempt.getStudent() != null
                          ? attempt.getStudent().getName()
                          : "Guest")
                  .studentEmail(
                      attempt != null && attempt.getStudent() != null
                          ? attempt.getStudent().getEmail()
                          : null)
                  .totalViolations(total)
                  .criticalCount(critical)
                  .build();
            })
        .collect(Collectors.toList());
  }

  /**
   * Checks if an attempt should be force-submitted due to violations.
   *
   * @param attemptId the attempt ID
   * @return true if force submit is required
   */
  @Transactional(readOnly = true)
  public boolean shouldForceSubmit(Long attemptId) {
    long totalViolations = violationRepository.countByAttemptId(attemptId);
    long criticalViolations =
        violationRepository.countByAttemptIdAndSeverity(attemptId, ViolationSeverity.CRITICAL);

    return totalViolations >= maxViolations || criticalViolations >= maxCriticalViolations;
  }

  /** Converts entity to DTO. */
  private ViolationDto toDto(ProctoringViolation violation) {
    return ViolationDto.builder()
        .id(violation.getId())
        .attemptId(violation.getAttempt().getId())
        .violationType(violation.getViolationType())
        .severity(violation.getSeverity())
        .message(violation.getMessage())
        .details(violation.getDetails())
        .clientTimestamp(violation.getClientTimestamp())
        .createdAt(violation.getCreatedAt())
        .build();
  }
}
