package com.testcreator.controller;

import com.testcreator.dto.student.GuestStartRequest;
import com.testcreator.dto.student.GuestSubmitAnswerRequest;
import com.testcreator.dto.student.GuestTestAccessDTO;
import com.testcreator.dto.student.GuestTestDetailDTO;
import com.testcreator.dto.student.QuestionWithOptionsDTO;
import com.testcreator.dto.student.TestAttemptDTO;
import com.testcreator.dto.student.TestResultDTO;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.GuestTestSession;
import com.testcreator.entity.Option;
import com.testcreator.entity.Question;
import com.testcreator.entity.ResultStatus;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestAttempt;
import com.testcreator.exception.BusinessException;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.GuestTestSessionRepository;
import com.testcreator.repository.OptionRepository;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import com.testcreator.service.ResultService;
import com.testcreator.service.StudentTestService;
import com.testcreator.service.TestAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for guest/anonymous test access.
 *
 * <p>Handles guest test taking without authentication. Public endpoints - no authentication
 * required.
 */
@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Guest Tests", description = "Anonymous test taking (No authentication required)")
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class GuestTestController {

  private final TestRepository testRepository;
  private final GuestTestSessionRepository guestSessionRepository;
  private final TestAttemptRepository testAttemptRepository;
  private final StudentAnswerRepository studentAnswerRepository;
  private final QuestionRepository questionRepository;
  private final OptionRepository optionRepository;
  private final StudentTestService studentTestService;
  private final TestAttemptService testAttemptService;
  private final ResultService resultService;

  @Value("${app.guest.token-expiry-hours:24}")
  private int guestTokenExpiryHours;

  @Value("${app.base-url:http://localhost:8080}")
  private String baseUrl;

  /**
   * Generates a guest access link for a test. For teachers/admins only via API.
   *
   * @param testId test ID
   * @return guest access link
   */
  @PostMapping("/tests/{testId}/generate-link")
  @Operation(
      summary = "Generate guest access link",
      description =
          "Creates a guest token for unauthenticated test access. Share this link with students.")
  @ApiResponses({
    @ApiResponse(responseCode = "201", description = "Guest link generated"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<GuestTestAccessDTO> generateGuestLink(
      @Parameter(description = "Test ID") @PathVariable Long testId) {

    log.info("Generating guest access link for test: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    // Generate unique guest token
    String guestToken = "guest_" + UUID.randomUUID();
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime expiresAt = now.plusHours(guestTokenExpiryHours);

    GuestTestSession session =
        GuestTestSession.builder()
            .guestToken(guestToken)
            .test(test)
            .createdAt(now)
            .expiresAt(expiresAt)
            .isUsed(false)
            .build();

    guestSessionRepository.save(session);

    String guestAccessUrl = baseUrl + "/api/guest/tests/" + guestToken;

    GuestTestAccessDTO dto =
        GuestTestAccessDTO.builder()
            .guestToken(guestToken)
            .testId(test.getId())
            .testTitle(test.getTitle())
            .guestAccessUrl(guestAccessUrl)
            .expirationMinutes(guestTokenExpiryHours * 60)
            .build();

    return ResponseEntity.status(HttpStatus.CREATED).body(dto);
  }

  /**
   * Looks up a test by access code and creates a guest session.
   *
   * @param accessCode the test access code (e.g., guest_a3f2b1)
   * @return guest test details with auto-generated session token
   */
  @GetMapping("/access/{accessCode}")
  @Operation(
      summary = "Look up test by access code",
      description =
          "Finds a published test by its access code and creates a guest session for the student")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Test found, guest session created"),
    @ApiResponse(
        responseCode = "404",
        description = "No published test found with this access code")
  })
  public ResponseEntity<GuestTestAccessDTO> lookupByAccessCode(
      @Parameter(description = "Test access code") @PathVariable String accessCode) {

    log.info("Guest looking up test by access code: {}", accessCode);

    Test test =
        testRepository
            .findByAccessCodeAndStatus(accessCode, com.testcreator.entity.TestStatus.PUBLISHED)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException("No published test found with this access code"));

    // Auto-create a guest session
    String guestToken = "guest_" + UUID.randomUUID();
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime expiresAt = now.plusHours(guestTokenExpiryHours);

    GuestTestSession session =
        GuestTestSession.builder()
            .guestToken(guestToken)
            .test(test)
            .createdAt(now)
            .expiresAt(expiresAt)
            .isUsed(false)
            .build();

    guestSessionRepository.save(session);

    GuestTestAccessDTO dto =
        GuestTestAccessDTO.builder()
            .guestToken(guestToken)
            .testId(test.getId())
            .testTitle(test.getTitle())
            .guestAccessUrl(baseUrl + "/api/guest/tests/" + guestToken)
            .expirationMinutes(guestTokenExpiryHours * 60)
            .build();

    return ResponseEntity.ok(dto);
  }

  /**
   * Invalidates (deletes) a guest session that hasn't been used yet. Called when a guest clicks
   * "Different Code" to discard the auto-created session.
   *
   * @param guestToken guest session token to invalidate
   * @return 204 No Content on success
   */
  @DeleteMapping("/sessions/{guestToken}")
  @Operation(
      summary = "Invalidate guest session",
      description =
          "Deletes an unused guest session. Used when a guest wants to try a different access"
              + " code.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Session invalidated"),
    @ApiResponse(responseCode = "404", description = "Session not found")
  })
  @Transactional
  public ResponseEntity<Void> invalidateGuestSession(
      @Parameter(description = "Guest token to invalidate") @PathVariable String guestToken) {

    log.info("Invalidating guest session with token: {}", guestToken);

    GuestTestSession session =
        guestSessionRepository
            .findByGuestToken(guestToken)
            .orElseThrow(() -> new ResourceNotFoundException("Guest session not found"));

    // Only delete if the session hasn't been used (test not started)
    if (session.getIsUsed()) {
      throw new BusinessException(
          "Cannot invalidate a session that has already been used to start a test");
    }

    guestSessionRepository.delete(session);

    log.info("Guest session invalidated: {}", guestToken);

    return ResponseEntity.noContent().build();
  }

  /**
   * Gets test details using guest token.
   *
   * @param guestToken guest session token
   * @return test details
   */
  @GetMapping("/tests/{guestToken}")
  @Operation(
      summary = "Get test details (Guest)",
      description = "Retrieve test details for anonymous access using guest token")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Test retrieved"),
    @ApiResponse(responseCode = "400", description = "Invalid or expired token"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<GuestTestDetailDTO> getTestAsGuest(
      @Parameter(description = "Guest token") @PathVariable String guestToken) {

    log.info("Guest accessing test with token: {}", guestToken);

    GuestTestSession session =
        guestSessionRepository
            .findValidByGuestTokenWithTest(guestToken)
            .orElseThrow(() -> new BusinessException("Invalid or expired guest token"));

    Test test = session.getTest();

    GuestTestDetailDTO dto =
        GuestTestDetailDTO.builder()
            .guestToken(guestToken)
            .testId(test.getId())
            .title(test.getTitle())
            .description(test.getDescription())
            .totalQuestions(test.getTotalQuestions())
            .durationMinutes(test.getDurationMinutes())
            .passingScore(test.getPassingScore())
            .build();

    return ResponseEntity.ok(dto);
  }

  /**
   * Starts a guest test attempt.
   *
   * @param guestToken guest session token
   * @return started test with questions
   */
  @PostMapping("/tests/{guestToken}/start")
  @Operation(summary = "Start guest test", description = "Initialize a guest test session")
  @ApiResponses({
    @ApiResponse(responseCode = "201", description = "Test started"),
    @ApiResponse(responseCode = "400", description = "Invalid token or test unavailable"),
    @ApiResponse(responseCode = "404", description = "Test not found")
  })
  public ResponseEntity<TestAttemptDTO> startGuestTest(
      @Parameter(description = "Guest token") @PathVariable String guestToken,
      @Valid @RequestBody GuestStartRequest request) {

    log.info("Guest starting test with token: {}", guestToken);

    GuestTestSession session =
        guestSessionRepository
            .findValidByGuestToken(guestToken)
            .orElseThrow(() -> new BusinessException("Invalid or expired guest token"));

    if (session.getIsUsed()) {
      throw new BusinessException("This guest test link has already been used");
    }

    // Fetch test with questions and options to avoid LazyInitializationException
    Test test =
        testRepository
            .findByIdWithQuestionsAndOptions(session.getTest().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    // Create test attempt for guest
    LocalDateTime startTime = LocalDateTime.now();

    TestAttempt attempt =
        TestAttempt.builder()
            .test(test)
            .student(null) // Guest - no student
            .guestName(request.getGuestName())
            .guestToken(session.getGuestToken())
            .startedAt(startTime)
            .status(com.testcreator.entity.AttemptStatus.IN_PROGRESS)
            .tabSwitchCount(0)
            .build();

    TestAttempt savedAttempt = testAttemptRepository.save(attempt);

    // Mark session as used
    session.setIsUsed(true);
    session.setUsedAt(LocalDateTime.now());
    guestSessionRepository.save(session);

    log.info("Guest test attempt started with ID: {}", savedAttempt.getId());

    // Map to DTO manually (without security context)
    TestAttemptDto dto = mapGuestAttemptToDto(savedAttempt, test, guestToken);

    return ResponseEntity.status(HttpStatus.CREATED).body(dto);
  }

  /**
   * Gets a guest attempt by ID.
   *
   * @param attemptId attempt ID
   * @return attempt details
   */
  @GetMapping("/attempts/{attemptId}")
  @Operation(
      summary = "Get guest attempt",
      description = "Retrieve guest attempt details (no login required)")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Attempt found"),
    @ApiResponse(responseCode = "404", description = "Attempt not found")
  })
  public ResponseEntity<TestAttemptDto> getGuestAttempt(
      @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

    log.info("Getting guest attempt: {}", attemptId);

    TestAttempt attempt =
        testAttemptRepository
            .findByIdWithAnswers(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

    if (attempt.getStudent() != null) {
      throw new BusinessException("This attempt is not a guest attempt");
    }

    // Fetch test with questions and options (to avoid LazyInitializationException)
    Test test =
        testRepository
            .findByIdWithQuestionsAndOptions(attempt.getTest().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Test not found"));

    TestAttemptDto dto = null;

    if (attempt.getStatus() != null && attempt.getStatus() != AttemptStatus.SUBMITTED) {
      dto = mapGuestAttemptToDto(attempt, test, null);
    } else {
      attempt.setTest(test); // Attach fully-initialized Test
      TestResultDto resultDto = resultService.getDetailedResult(attempt);

      dto = mapGuestAttemptToDto(attempt, test, attempt.getGuestToken());
      // Map to DTO (reuse your existing mapping logic)
      dto = mapGuestResultToAttemptDto(dto, resultDto, test);
      dto.setResult(resultDto);
    }
    return ResponseEntity.ok(dto);
  }

  private TestAttemptDto mapGuestResultToAttemptDto(
      TestAttemptDto attemptDto, TestResultDto resultDto, Test test) {

    return TestAttemptDto.builder()
        .id(attemptDto.getId())
        .testId(resultDto.getTestId())
        .testTitle(resultDto.getTestTitle())
        .studentId(null) // Guest - no student
        .guestName(attemptDto.getGuestName())
        .startedAt(attemptDto.getStartedAt())
        .expiresAt(attemptDto.getExpiresAt())
        .remainingMinutes(attemptDto.getRemainingMinutes())
        .totalQuestions(test.getTotalQuestions())
        .answeredQuestions(0)
        .status(attemptDto.getStatus())
        .submitted(false)
        .questions(attemptDto.getQuestions())
        .answers(attemptDto.getAnswers())
        .result(resultDTO)
        .build();
  }

  /**
   * Submits a guest answer.
   *
   * @param attemptId attempt ID
   * @param request answer submission
   * @return success response
   */
  @PostMapping("/attempts/{attemptId}/answer")
  @Operation(
      summary = "Submit guest answer",
      description = "Submit answer for a single question during guest test")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Answer saved"),
    @ApiResponse(responseCode = "400", description = "Invalid answer or session expired"),
    @ApiResponse(responseCode = "404", description = "Attempt not found")
  })
  public ResponseEntity<Void> submitGuestAnswer(
      @Parameter(description = "Attempt ID") @PathVariable Long attemptId,
      @Valid @RequestBody GuestSubmitAnswerRequest request) {

    log.info(
        "Guest submitting answer for attempt: {}, question: {}, optionId: {}",
        attemptId,
        request.getQuestionId(),
        request.getSelectedOptionId());

    TestAttempt attempt =
        testAttemptRepository
            .findByIdWithTest(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

    if (attempt.getStudent() != null) {
      throw new BusinessException("This attempt is not a guest attempt");
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

    // Get the selected option and validate it belongs to the question
    Option selectedOption =
        optionRepository
            .findById(request.getSelectedOptionId())
            .orElseThrow(() -> new ResourceNotFoundException("Option not found"));

    if (!selectedOption.getQuestion().getId().equals(question.getId())) {
      throw new BusinessException("This option does not belong to this question");
    }

    // Atomic upsert — avoids duplicate key race condition
    studentAnswerRepository.upsertAnswer(
        attemptId,
        request.getQuestionId(),
        selectedOption.getOptionNumber(),
        false,
        LocalDateTime.now());

    log.info("Guest answer saved for question: {}", request.getQuestionId());

    return ResponseEntity.ok().build();
  }

  /**
   * Submits guest test for grading and shows result.
   *
   * @param attemptId attempt ID
   * @return test result
   */
  @PostMapping("/attempts/{attemptId}/submit")
  @Operation(
      summary = "Submit guest test",
      description = "Submit test and immediately see results (no login required)")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Test submitted and graded"),
    @ApiResponse(responseCode = "400", description = "Cannot submit attempt"),
    @ApiResponse(responseCode = "404", description = "Attempt not found")
  })
  @Transactional
  public ResponseEntity<TestResultDTO> submitGuestTest(
      @Parameter(description = "Attempt ID") @PathVariable Long attemptId) {

    log.info("Guest submitting test for attempt: {}", attemptId);

    TestAttempt attempt =
        testAttemptRepository
            .findByIdWithAnswers(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

    if (attempt.getStudent() != null) {
      throw new BusinessException("This attempt is not a guest attempt");
    }

    // Check if attempt is still active
    if (!attempt.getStatus().equals(AttemptStatus.IN_PROGRESS)) {
      throw new BusinessException("This attempt cannot be submitted");
    }

    // Update attempt status
    attempt.setStatus(AttemptStatus.SUBMITTED);
    attempt.setSubmittedAt(LocalDateTime.now());

    // Calculate score and result
    TestResultDTO result = resultService.calculateResult(attempt);

    // Update attempt with score and result
    attempt.setScore(result.getScore().intValue());
    attempt.setResult(ResultStatus.valueOf(result.getResult()));

    testAttemptRepository.save(attempt);

    log.info("Guest test submitted and graded for attempt: {}", attemptId);

    return ResponseEntity.ok(result);
  }

  /** Maps guest test attempt to DTO (without security context). */
  private TestAttemptDto mapGuestAttemptToDto(TestAttempt attempt, Test test, String guestToken) {
    var questions =
        test.getQuestions().stream()
            .sorted(Comparator.comparing(Question::getQuestionNumber))
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
                                    .toList()))
                        .build())
            .toList();

    LocalDateTime expiryTime = attempt.getExpiryTime(test.getDurationMinutes());
    long secondsRemaining =
        expiryTime != null
            ? java.time.temporal.ChronoUnit.SECONDS.between(LocalDateTime.now(), expiryTime)
            : 0;
    int minutesRemaining = (int) Math.max(0, secondsRemaining / 60);

    return TestAttemptDto.builder()
        .id(attempt.getId())
        .testId(test.getId())
        .testTitle(test.getTitle())
        .studentId(null) // Guest - no student
        .guestName(attempt.getGuestName())
        .startedAt(attempt.getStartedAt())
        .expiresAt(expiryTime)
        .remainingMinutes(minutesRemaining)
        .totalQuestions(test.getTotalQuestions())
        .answeredQuestions(0)
        .status(attempt.getStatus().name())
        .submitted(false)
        .questions(questions)
        .answers(Collections.emptyList())
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
