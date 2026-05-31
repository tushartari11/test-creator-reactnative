package com.testcreator.service;

import com.testcreator.dto.student.CachedAnswerDto;
import com.testcreator.dto.student.QuestionWithOptionsDto;
import com.testcreator.dto.student.StudentAnswerRecordDto;
import com.testcreator.dto.student.StudentResultSummaryDto;
import com.testcreator.dto.student.SubmitAnswerRequest;
import com.testcreator.dto.student.TestAttemptDto;
import com.testcreator.dto.student.TestResultDto;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.Question;
import com.testcreator.entity.ResultStatus;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestAttempt;
import com.testcreator.entity.TestStatus;
import com.testcreator.entity.User;
import com.testcreator.exception.BusinessException;
import com.testcreator.exception.ForbiddenException;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.OptionRepository;
import com.testcreator.repository.ProctoringViolationRepository;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import com.testcreator.repository.UserRepository;
import com.testcreator.security.SecurityUtil;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing test attempts.
 *
 * <p>Handles starting attempts, submitting answers, and managing attempt sessions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestAttemptService {

  private final TestAttemptRepository testAttemptRepository;
  private final StudentAnswerRepository studentAnswerRepository;
  private final ProctoringViolationRepository proctoringViolationRepository;
  private final TestRepository testRepository;
  private final QuestionRepository questionRepository;
  private final OptionRepository optionRepository;
  private final UserRepository userRepository;
  private final ResultService resultService;
  private final SecurityUtil securityUtil;
  private final AnswerCacheService answerCacheService;
  private final AnswerSyncService answerSyncService;

  /**
   * Starts a new test attempt for a student.
   *
   * @param testId test ID
   * @return started test attempt with questions
   */
  public TestAttemptDto startAttempt(Long testId) {
    log.info("Starting test attempt for test: {}", testId);

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Validate student can attempt
    if (!test.getStatus().equals(TestStatus.PUBLISHED)) {
      throw new BusinessException("This test is not available");
    }

    // Resume existing active attempt if one exists
    Optional<TestAttempt> existingAttempt =
        testAttemptRepository.findFirstByTestIdAndStudentIdAndStatus(
            testId, student.getId(), AttemptStatus.IN_PROGRESS);

    if (existingAttempt.isPresent()) {
      log.info("Resuming existing attempt: {}", existingAttempt.get().getId());
      return mapToTestAttemptDto(existingAttempt.get(), test);
    }

    // Create new attempt
    LocalDateTime startTime = LocalDateTime.now();

    TestAttempt attempt =
        TestAttempt.builder()
            .test(test)
            .student(student)
            .startedAt(startTime)
            .status(AttemptStatus.IN_PROGRESS)
            .tabSwitchCount(0)
            .build();

    TestAttempt savedAttempt = testAttemptRepository.save(attempt);
    log.info("Test attempt started with ID: {}", savedAttempt.getId());

    return mapToTestAttemptDto(savedAttempt, test);
  }

  /**
   * Gets current test attempt progress.
   *
   * @param attemptId attempt ID
   * @return current attempt progress
   */
  @Transactional(readOnly = true)
  public TestAttemptDto getAttemptProgress(Long attemptId) {
    log.info("Getting attempt progress for attempt: {}", attemptId);

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    TestAttempt attempt =
        testAttemptRepository
            .findByIdWithAnswers(attemptId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

    // Verify ownership
    if (!attempt.getStudent().getId().equals(student.getId())) {
      throw new ForbiddenException("You don't have permission to view this attempt");
    }

    // Check if expired
    LocalDateTime expiryTime = attempt.getExpiryTime(attempt.getTest().getDurationMinutes());
    if (expiryTime != null
        && LocalDateTime.now().isAfter(expiryTime)
        && attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
      attempt.setStatus(AttemptStatus.EXPIRED);
      testAttemptRepository.save(attempt);
      throw new BusinessException("Your test session has expired");
    }

    return mapToTestAttemptDto(attempt, attempt.getTest());
  }

  /**
   * Submits an answer for a question.
   *
   * @param attemptId attempt ID
   * @param request answer submission request
   */
  public void submitAnswer(Long attemptId, SubmitAnswerRequest request) {
    log.info(
        "Submitting answer for attempt: {} and question: {}", attemptId, request.getQuestionId());

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    TestAttempt attempt =
        testAttemptRepository
            .findById(attemptId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

    // Verify ownership
    if (!attempt.getStudent().getId().equals(student.getId())) {
      throw new ForbiddenException("You don't have permission to submit for this attempt");
    }

    // Check if attempt is still active
    if (!attempt.getStatus().equals(AttemptStatus.IN_PROGRESS)) {
      throw new BusinessException("This attempt is not active");
    }

    // Check if not expired
    LocalDateTime expiryTime = attempt.getExpiryTime(attempt.getTest().getDurationMinutes());
    if (expiryTime != null && LocalDateTime.now().isAfter(expiryTime)) {
      attempt.setStatus(AttemptStatus.EXPIRED);
      testAttemptRepository.save(attempt);
      throw new BusinessException("Test session has expired");
    }

    // Validate question belongs to this test
    Question question =
        questionRepository
            .findById(request.getQuestionId())
            .orElseThrow(() -> new ResourceNotFoundException("Question not found"));

    if (!question.getTest().getId().equals(attempt.getTest().getId())) {
      throw new BusinessException("This question does not belong to this test");
    }

    // Validate option is valid (1-3)
    if (request.getSelectedOption() < 1 || request.getSelectedOption() > 3) {
      throw new BusinessException("Invalid option number");
    }

    // Atomic upsert — avoids duplicate key race condition
    studentAnswerRepository.upsertAnswer(
        attemptId,
        request.getQuestionId(),
        request.getSelectedOption(),
        false,
        LocalDateTime.now());

    // Also cache in Redis for auto-save recovery
    try {
      answerCacheService.cacheAnswer(
          attemptId, request.getQuestionId(), request.getSelectedOption());
    } catch (Exception e) {
      log.warn("Failed to cache answer in Redis: {}", e.getMessage());
      // Don't fail the request if Redis is unavailable
    }

    log.info("Answer saved for question: {}", request.getQuestionId());
  }

  /**
   * Submits entire test for grading.
   *
   * @param attemptId attempt ID
   * @return test result
   */
  public TestResultDto submitTest(Long attemptId) {
    log.info("Submitting test for attempt: {}", attemptId);

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    TestAttempt attempt =
        testAttemptRepository
            .findByIdWithAnswers(attemptId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

    // Verify ownership
    if (!attempt.getStudent().getId().equals(student.getId())) {
      throw new ForbiddenException("You don't have permission to submit this attempt");
    }

    // Check if attempt is still active
    if (!attempt.getStatus().equals(AttemptStatus.IN_PROGRESS)) {
      throw new BusinessException("This attempt cannot be submitted");
    }

    // Update attempt status
    attempt.setStatus(AttemptStatus.SUBMITTED);
    attempt.setSubmittedAt(LocalDateTime.now());

    // Calculate score and result
    TestResultDto result = resultService.calculateResult(attempt);

    // Update attempt with score and result
    attempt.setScore(result.getScore().intValue());
    attempt.setResult(ResultStatus.valueOf(result.getResult()));

    testAttemptRepository.save(attempt);

    // Clear Redis cache for this attempt
    try {
      answerCacheService.clearAttemptCache(attemptId);
    } catch (Exception e) {
      log.warn("Failed to clear answer cache: {}", e.getMessage());
    }

    log.info("Test submitted and graded for attempt: {}", attemptId);

    return result;
  }

  /**
   * Validates that the current user owns the attempt and returns it.
   *
   * @param attemptId attempt ID
   * @return the attempt if validation passes
   * @throws ResourceNotFoundException if attempt not found
   * @throws ForbiddenException if user doesn't own the attempt
   */
  @Transactional(readOnly = true)
  public TestAttempt validateAndGetAttempt(Long attemptId) {
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    TestAttempt attempt =
        testAttemptRepository
            .findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

    if (attempt.getStudent() != null && !attempt.getStudent().getId().equals(student.getId())) {
      throw new ForbiddenException("You don't have permission to access this attempt");
    }

    return attempt;
  }

  /**
   * Auto-saves an answer to Redis cache.
   *
   * @param attemptId attempt ID
   * @param request answer submission request
   */
  public void autoSaveAnswer(Long attemptId, SubmitAnswerRequest request) {
    log.debug(
        "Auto-saving answer - attemptId: {}, questionId: {}", attemptId, request.getQuestionId());

    // Validate ownership
    validateAndGetAttempt(attemptId);

    // Cache in Redis (fast operation)
    answerCacheService.cacheAnswer(attemptId, request.getQuestionId(), request.getSelectedOption());
  }

  /**
   * Recovers cached answers from Redis.
   *
   * @param attemptId attempt ID
   * @return list of cached answers
   */
  @Transactional(readOnly = true)
  public List<CachedAnswerDto> recoverCachedAnswers(Long attemptId) {
    log.info("Recovering cached answers - attemptId: {}", attemptId);

    // Validate ownership
    validateAndGetAttempt(attemptId);

    return answerCacheService.getAllCachedAnswers(attemptId);
  }

  /**
   * Sends heartbeat for an attempt.
   *
   * @param attemptId attempt ID
   */
  public void sendHeartbeat(Long attemptId) {
    log.debug("Heartbeat received - attemptId: {}", attemptId);

    // Validate ownership
    validateAndGetAttempt(attemptId);

    answerCacheService.updateHeartbeat(attemptId);
  }

  /**
   * Gets detailed result for an attempt with ownership validation.
   *
   * @param attemptId attempt ID
   * @return detailed test result
   */
  @Transactional(readOnly = true)
  public TestResultDto getDetailedResult(Long attemptId) {
    log.info("Getting detailed result - attemptId: {}", attemptId);

    // Validate ownership
    TestAttempt attempt = validateAndGetAttempt(attemptId);

    return resultService.getDetailedResult(attempt);
  }

  /**
   * Gets all submitted results for the current student.
   *
   * @param pageable pagination info
   * @return page of result summaries
   */
  @Transactional(readOnly = true)
  public Page<StudentResultSummaryDto> getAllResultsForCurrentStudent(Pageable pageable) {
    log.info("Getting all results for current student");

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User student =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    return testAttemptRepository
        .findSubmittedAttemptsByStudent(student.getId(), pageable)
        .map(
            attempt ->
                StudentResultSummaryDto.builder()
                    .attemptId(attempt.getId())
                    .testId(attempt.getTest().getId())
                    .testTitle(attempt.getTest().getTitle())
                    .score(attempt.getScore() != null ? attempt.getScore().doubleValue() : null)
                    .result(attempt.getResult() != null ? attempt.getResult().name() : null)
                    .submittedAt(attempt.getSubmittedAt())
                    .build());
  }

  /**
   * Resets (deletes) a student's attempt for a test, allowing them to retake it. Only the teacher
   * who created the test may call this.
   *
   * @param testId the test ID
   * @param studentId the student's user ID
   */
  public void resetStudentAttempt(Long testId, Long studentId) {
    log.info("Resetting attempt for student {} on test {}", studentId, testId);

    String teacherEmail = securityUtil.getCurrentUserEmail();
    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
      throw new ForbiddenException("You don't have permission to reset attempts for this test");
    }

    TestAttempt attempt =
        testAttemptRepository
            .findByTestIdAndStudentId(testId, studentId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "No attempt found for student " + studentId + " on test " + testId));

    Long attemptId = attempt.getId();

    proctoringViolationRepository.deleteAllByAttemptId(attemptId);
    studentAnswerRepository.deleteByAttemptId(attemptId);
    testAttemptRepository.delete(attempt);

    try {
      answerCacheService.clearAttemptCache(attemptId);
    } catch (Exception e) {
      log.warn("Failed to clear Redis cache for attempt {}: {}", attemptId, e.getMessage());
    }

    log.info("Attempt {} reset successfully", attemptId);
  }

  /** Maps TestAttempt entity to TestAttemptDto. */
  private TestAttemptDto mapToTestAttemptDto(TestAttempt attempt, Test test) {
    List<QuestionWithOptionsDto> questions =
        test.getQuestions().stream()
            .map(
                question ->
                    QuestionWithOptionsDto.builder()
                        .id(question.getId())
                        .questionNumber(question.getQuestionNumber())
                        .questionText(question.getQuestionText())
                        .options(
                            shuffleOptions(
                                question.getOptions().stream()
                                    .map(
                                        option ->
                                            QuestionWithOptionsDto.OptionDto.builder()
                                                .id(option.getId())
                                                .optionNumber(option.getOptionNumber())
                                                .optionText(option.getOptionText())
                                                .build())
                                    .collect(Collectors.toList())))
                        .build())
            .collect(Collectors.toList());

    List<StudentAnswerRecordDto> answers =
        attempt.getAnswers().stream()
            .map(
                answer ->
                    StudentAnswerRecordDto.builder()
                        .id(answer.getId())
                        .questionId(answer.getQuestion().getId())
                        .selectedOption(answer.getSelectedOption())
                        .submittedAt(answer.getAnsweredAt())
                        .build())
            .collect(Collectors.toList());

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime expiryTime = attempt.getExpiryTime(test.getDurationMinutes());
    long secondsRemaining =
        expiryTime != null ? java.time.temporal.ChronoUnit.SECONDS.between(now, expiryTime) : 0;
    int minutesRemaining = (int) Math.max(0, secondsRemaining / 60);

    return TestAttemptDto.builder()
        .id(attempt.getId())
        .testId(test.getId())
        .testTitle(test.getTitle())
        .studentId(attempt.getStudent().getId())
        .startedAt(attempt.getStartedAt())
        .expiresAt(expiryTime)
        .remainingMinutes(minutesRemaining)
        .totalQuestions(test.getTotalQuestions())
        .answeredQuestions(answers.size())
        .status(attempt.getStatus().name())
        .submitted(attempt.getStatus() == AttemptStatus.SUBMITTED)
        .questions(questions)
        .answers(answers)
        .build();
  }

  /** Returns a new list with options in random order. */
  private List<QuestionWithOptionsDto.OptionDto> shuffleOptions(
      List<QuestionWithOptionsDto.OptionDto> options) {
    var shuffled = new ArrayList<>(options);
    Collections.shuffle(shuffled);
    return shuffled;
  }
}
