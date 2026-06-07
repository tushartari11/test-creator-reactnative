package com.testcreator.service;

import com.testcreator.dto.student.CachedAnswerDto;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for caching test answers in Redis.
 *
 * <p>Provides fast read/write operations for auto-save functionality. Answers are cached during
 * test taking and periodically synced to database.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnswerCacheService {

  private final RedisTemplate<String, Object> redisTemplate;

  // Key prefixes
  private static final String ANSWER_KEY_PREFIX = "answer:";
  private static final String ATTEMPT_ANSWERS_KEY_PREFIX = "attempt_answers:";
  private static final String ATTEMPT_SESSION_KEY_PREFIX = "attempt_session:";

  // TTL - 4 hours (longer than max test duration)
  private static final Duration ANSWER_TTL = Duration.ofHours(4);

  /**
   * Caches a student's answer for a question.
   *
   * @param attemptId test attempt ID
   * @param questionId question ID
   * @param selectedOption selected option (1-3)
   */
  public void cacheAnswer(Long attemptId, Long questionId, Integer selectedOption) {
    String answerKey = buildAnswerKey(attemptId, questionId);
    String attemptAnswersKey = buildAttemptAnswersKey(attemptId);

    CachedAnswerDto cachedAnswer =
        CachedAnswerDto.builder()
            .attemptId(attemptId)
            .questionId(questionId)
            .selectedOption(selectedOption)
            .cachedAt(LocalDateTime.now())
            .syncedToDb(false)
            .build();

    // Store individual answer
    redisTemplate.opsForValue().set(answerKey, cachedAnswer, ANSWER_TTL);

    // Add to attempt's answer set for quick retrieval
    redisTemplate.opsForSet().add(attemptAnswersKey, questionId.toString());
    redisTemplate.expire(attemptAnswersKey, ANSWER_TTL);

    log.debug(
        "Cached answer for attempt: {}, question: {}, option: {}",
        attemptId,
        questionId,
        selectedOption);
  }

  /**
   * Retrieves a cached answer for a specific question.
   *
   * @param attemptId test attempt ID
   * @param questionId question ID
   * @return cached answer or null if not found
   */
  public CachedAnswerDto getCachedAnswer(Long attemptId, Long questionId) {
    String answerKey = buildAnswerKey(attemptId, questionId);
    Object cached = redisTemplate.opsForValue().get(answerKey);
    if (cached instanceof CachedAnswerDto) {
      return (CachedAnswerDto) cached;
    }
    return null;
  }

  /**
   * Retrieves all cached answers for an attempt.
   *
   * @param attemptId test attempt ID
   * @return list of cached answers
   */
  public List<CachedAnswerDto> getAllCachedAnswers(Long attemptId) {
    String attemptAnswersKey = buildAttemptAnswersKey(attemptId);
    Set<Object> questionIds = redisTemplate.opsForSet().members(attemptAnswersKey);

    if (questionIds == null || questionIds.isEmpty()) {
      return new ArrayList<>();
    }

    List<CachedAnswerDto> answers = new ArrayList<>();
    for (Object questionIdObj : questionIds) {
      Long questionId = Long.parseLong(questionIdObj.toString());
      CachedAnswerDto cached = getCachedAnswer(attemptId, questionId);
      if (cached != null) {
        answers.add(cached);
      }
    }

    return answers;
  }

  /**
   * Gets all unsynced answers for an attempt.
   *
   * @param attemptId test attempt ID
   * @return list of answers not yet synced to database
   */
  public List<CachedAnswerDto> getUnsyncedAnswers(Long attemptId) {
    return getAllCachedAnswers(attemptId).stream()
        .filter(a -> !Boolean.TRUE.equals(a.getSyncedToDb()))
        .collect(Collectors.toList());
  }

  /**
   * Marks answers as synced to database.
   *
   * @param attemptId test attempt ID
   * @param questionIds question IDs that were synced
   */
  public void markAnswersSynced(Long attemptId, List<Long> questionIds) {
    for (Long questionId : questionIds) {
      String answerKey = buildAnswerKey(attemptId, questionId);
      CachedAnswerDto cached = getCachedAnswer(attemptId, questionId);
      if (cached != null) {
        cached.setSyncedToDb(true);
        redisTemplate.opsForValue().set(answerKey, cached, ANSWER_TTL);
      }
    }
    log.debug("Marked {} answers as synced for attempt: {}", questionIds.size(), attemptId);
  }

  /**
   * Removes all cached answers for an attempt (after final submission).
   *
   * @param attemptId test attempt ID
   */
  public void clearAttemptCache(Long attemptId) {
    String attemptAnswersKey = buildAttemptAnswersKey(attemptId);
    Set<Object> questionIds = redisTemplate.opsForSet().members(attemptAnswersKey);

    if (questionIds != null) {
      for (Object questionIdObj : questionIds) {
        String answerKey = buildAnswerKey(attemptId, Long.parseLong(questionIdObj.toString()));
        redisTemplate.delete(answerKey);
      }
    }

    redisTemplate.delete(attemptAnswersKey);
    redisTemplate.delete(buildAttemptSessionKey(attemptId));

    log.info("Cleared cache for attempt: {}", attemptId);
  }

  /**
   * Stores attempt session info for recovery.
   *
   * @param attemptId test attempt ID
   * @param sessionData session data map
   */
  public void storeAttemptSession(Long attemptId, Map<String, Object> sessionData) {
    String sessionKey = buildAttemptSessionKey(attemptId);
    redisTemplate.opsForHash().putAll(sessionKey, sessionData);
    redisTemplate.expire(sessionKey, ANSWER_TTL);
  }

  /**
   * Retrieves attempt session info for recovery.
   *
   * @param attemptId test attempt ID
   * @return session data map or null
   */
  public Map<Object, Object> getAttemptSession(Long attemptId) {
    String sessionKey = buildAttemptSessionKey(attemptId);
    Map<Object, Object> session = redisTemplate.opsForHash().entries(sessionKey);
    return session.isEmpty() ? null : session;
  }

  /**
   * Updates heartbeat timestamp for session monitoring.
   *
   * @param attemptId test attempt ID
   */
  public void updateHeartbeat(Long attemptId) {
    String sessionKey = buildAttemptSessionKey(attemptId);
    redisTemplate.opsForHash().put(sessionKey, "lastHeartbeat", LocalDateTime.now().toString());
    redisTemplate.expire(sessionKey, ANSWER_TTL);
  }

  /**
   * Checks if an attempt has an active session in cache.
   *
   * @param attemptId test attempt ID
   * @return true if session exists
   */
  public boolean hasActiveSession(Long attemptId) {
    String sessionKey = buildAttemptSessionKey(attemptId);
    return Boolean.TRUE.equals(redisTemplate.hasKey(sessionKey));
  }

  /**
   * Gets count of cached answers for an attempt.
   *
   * @param attemptId test attempt ID
   * @return number of cached answers
   */
  public long getCachedAnswerCount(Long attemptId) {
    String attemptAnswersKey = buildAttemptAnswersKey(attemptId);
    Long count = redisTemplate.opsForSet().size(attemptAnswersKey);
    return count != null ? count : 0;
  }

  // Key builders
  private String buildAnswerKey(Long attemptId, Long questionId) {
    return ANSWER_KEY_PREFIX + attemptId + ":" + questionId;
  }

  private String buildAttemptAnswersKey(Long attemptId) {
    return ATTEMPT_ANSWERS_KEY_PREFIX + attemptId;
  }

  private String buildAttemptSessionKey(Long attemptId) {
    return ATTEMPT_SESSION_KEY_PREFIX + attemptId;
  }
}
