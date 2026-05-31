package com.testcreator.service;

import com.testcreator.dto.student.CachedAnswerDTO;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.TestAttempt;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for syncing cached answers to database.
 *
 * <p>Runs periodic background jobs to persist Redis-cached answers to PostgreSQL for durability and
 * recovery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnswerSyncService {

  private final AnswerCacheService answerCacheService;
  private final StudentAnswerRepository studentAnswerRepository;
  private final TestAttemptRepository testAttemptRepository;

  /** Syncs all unsynced cached answers to database. Runs every 30 seconds. */
  @Scheduled(fixedRate = 30000) // 30 seconds
  @Transactional
  public void syncCachedAnswersToDatabase() {
    log.debug("Starting scheduled answer sync...");

    // Get all active (in-progress) attempts
    List<TestAttempt> activeAttempts =
        testAttemptRepository.findAll().stream()
            .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
            .collect(Collectors.toList());

    int totalSynced = 0;

    for (TestAttempt attempt : activeAttempts) {
      try {
        int synced = syncAttemptAnswers(attempt.getId());
        totalSynced += synced;
      } catch (Exception e) {
        log.error("Failed to sync answers for attempt {}: {}", attempt.getId(), e.getMessage());
      }
    }

    if (totalSynced > 0) {
      log.info("Synced {} answers to database", totalSynced);
    }
  }

  /**
   * Syncs cached answers for a specific attempt to database.
   *
   * @param attemptId test attempt ID
   * @return number of answers synced
   */
  @Transactional
  public int syncAttemptAnswers(Long attemptId) {
    List<CachedAnswerDTO> unsyncedAnswers = answerCacheService.getUnsyncedAnswers(attemptId);

    if (unsyncedAnswers.isEmpty()) {
      return 0;
    }

    TestAttempt attempt = testAttemptRepository.findById(attemptId).orElse(null);
    if (attempt == null || attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
      return 0;
    }

    List<Long> syncedQuestionIds =
        unsyncedAnswers.stream()
            .map(
                cached -> {
                  try {
                    saveAnswerToDatabase(attempt, cached);
                    return cached.getQuestionId();
                  } catch (Exception e) {
                    log.error(
                        "Failed to sync answer for question {}: {}",
                        cached.getQuestionId(),
                        e.getMessage());
                    return null;
                  }
                })
            .filter(id -> id != null)
            .collect(Collectors.toList());

    // Mark as synced in cache
    if (!syncedQuestionIds.isEmpty()) {
      answerCacheService.markAnswersSynced(attemptId, syncedQuestionIds);
    }

    return syncedQuestionIds.size();
  }

  /** Saves or updates a single answer to the database. */
  private void saveAnswerToDatabase(TestAttempt attempt, CachedAnswerDTO cached) {
    // Atomic upsert — avoids duplicate key race condition
    studentAnswerRepository.upsertAnswer(
        attempt.getId(),
        cached.getQuestionId(),
        cached.getSelectedOption(),
        false,
        cached.getCachedAt() != null ? cached.getCachedAt() : LocalDateTime.now());
  }

  /**
   * Immediately syncs all cached answers for an attempt (before final submission).
   *
   * @param attemptId test attempt ID
   */
  @Transactional
  public void syncAllBeforeSubmit(Long attemptId) {
    log.info("Syncing all answers before submit for attempt: {}", attemptId);

    List<CachedAnswerDTO> allCachedAnswers = answerCacheService.getAllCachedAnswers(attemptId);

    TestAttempt attempt = testAttemptRepository.findById(attemptId).orElse(null);
    if (attempt == null) {
      return;
    }

    for (CachedAnswerDTO cached : allCachedAnswers) {
      try {
        saveAnswerToDatabase(attempt, cached);
      } catch (Exception e) {
        log.error(
            "Failed to sync answer for question {}: {}", cached.getQuestionId(), e.getMessage());
      }
    }

    // Clear cache after successful sync
    answerCacheService.clearAttemptCache(attemptId);
  }

  /**
   * Recovers answers from cache for a reconnecting user.
   *
   * @param attemptId test attempt ID
   * @return list of cached answers
   */
  public List<CachedAnswerDTO> recoverCachedAnswers(Long attemptId) {
    log.info("Recovering cached answers for attempt: {}", attemptId);
    return answerCacheService.getAllCachedAnswers(attemptId);
  }
}
