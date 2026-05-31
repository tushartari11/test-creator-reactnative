package com.testcreator.service;

import com.testcreator.dto.test.CreateTestRequest;
import com.testcreator.dto.test.ImportTestResponse;
import com.testcreator.dto.test.QuestionRequest;
import com.testcreator.dto.test.TestDTO;
import com.testcreator.dto.test.TestDetailDTO;
import com.testcreator.dto.test.TestListDTO;
import com.testcreator.entity.Option;
import com.testcreator.entity.Question;
import com.testcreator.entity.Role;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestStatus;
import com.testcreator.entity.User;
import com.testcreator.exception.BusinessException;
import com.testcreator.exception.ForbiddenException;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.OptionRepository;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import com.testcreator.repository.UserRepository;
import com.testcreator.security.SecurityUtil;
import com.testcreator.util.CsvQuestionParser;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service for managing tests.
 *
 * <p>Handles CRUD operations, validation, and business logic for tests.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class TestService {

  private final TestRepository testRepository;
  private final QuestionRepository questionRepository;
  private final OptionRepository optionRepository;
  private final TestAttemptRepository testAttemptRepository;
  private final UserRepository userRepository;
  private final SecurityUtil securityUtil;

  /**
   * Parses a CSV file and returns ImportTestResponse for review.
   *
   * @param file CSV file
   * @param testName Name of the test
   * @param duration Duration in minutes
   * @return ImportTestResponse with parsed questions and errors
   */
  public ImportTestResponse importTestFromCsv(
      MultipartFile file, String testName, Integer duration) {
    List<String> errors = new ArrayList<>();
    List<QuestionRequest> questions = CsvQuestionParser.parse(file, errors);
    ImportTestResponse response =
        ImportTestResponse.builder()
            .testName(testName)
            .durationMinutes(duration)
            .questions(questions)
            .errors(errors)
            .build();
    return response;
  }

  /**
   * Creates a new test.
   *
   * @param request test creation request
   * @return created test DTO
   */
  public TestDTO createTest(CreateTestRequest request) {
    log.info("Creating new test: {}", request.getTitle());

    // Get current user (teacher)
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User teacher =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    // Validate user is teacher
    if (!teacher.getRole().equals(Role.TEACHER)) {
      throw new ForbiddenException("Only teachers can create tests");
    }

    // Validate questions count
    if (request.getQuestions().size() != request.getTotalQuestions()) {
      throw new BusinessException("Number of questions must match totalQuestions");
    }

    // Validate each question has exactly 3 options
    request
        .getQuestions()
        .forEach(
            q -> {
              if (q.getOptions().size() != 3) {
                throw new BusinessException("Each question must have exactly 3 options");
              }
              if (q.getCorrectOptionNumber() < 1 || q.getCorrectOptionNumber() > 3) {
                throw new BusinessException("Correct option must be between 1 and 3");
              }
            });

    // Create test
    Test test =
        Test.builder()
            .title(request.getTitle())
            .description(request.getDescription())
            .totalQuestions(request.getTotalQuestions())
            .passingScore(request.getPassingScore())
            .durationMinutes(request.getDurationMinutes())
            .testDate(request.getTestDate() != null ? parseDateTime(request.getTestDate()) : null)
            .status(TestStatus.DRAFT)
            .createdBy(teacher)
            .build();

    Test savedTest = testRepository.save(test);
    log.info("Test created with ID: {}", savedTest.getId());

    // Create questions and options
    request
        .getQuestions()
        .forEach(
            qReq -> {
              Question question =
                  Question.builder()
                      .test(savedTest)
                      .questionNumber(qReq.getQuestionNumber())
                      .questionText(qReq.getQuestionText())
                      .explanation(qReq.getExplanation())
                      .correctOptionNumber(qReq.getCorrectOptionNumber())
                      .build();

              Question savedQuestion = questionRepository.save(question);

              // Create options
              qReq.getOptions()
                  .forEach(
                      oReq -> {
                        Option option =
                            Option.builder()
                                .question(savedQuestion)
                                .optionNumber(oReq.getOptionNumber())
                                .optionText(oReq.getOptionText())
                                .build();
                        optionRepository.save(option);
                      });
            });

    return mapToTestDTO(savedTest, teacher);
  }

  /**
   * Retrieves all tests created by the current teacher.
   *
   * @param pageable pagination info
   * @param status optional status filter
   * @return page of tests
   */
  @Transactional(readOnly = true)
  public Page<TestListDTO> getAllTestsByTeacher(Pageable pageable, String status) {
    log.info("Fetching tests for current teacher");

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    User teacher =
        userRepository
            .findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    Page<Test> tests;
    if (status != null && !status.isEmpty()) {
      TestStatus testStatus = TestStatus.valueOf(status.toUpperCase());
      tests = testRepository.findByCreatedByAndStatus(teacher, testStatus, pageable);
    } else {
      tests = testRepository.findByCreatedBy(teacher, pageable);
    }

    List<TestListDTO> dtos =
        tests.getContent().stream()
            .map(
                test ->
                    TestListDTO.builder()
                        .id(test.getId())
                        .title(test.getTitle())
                        .totalQuestions(test.getTotalQuestions())
                        .testDate(test.getTestDate())
                        .status(test.getStatus().name())
                        .accessCode(test.getAccessCode())
                        .createdAt(test.getCreatedAt())
                        .attemptCount(testAttemptRepository.countByTestId(test.getId()))
                        .build())
            .collect(Collectors.toList());

    return new PageImpl<>(dtos, pageable, tests.getTotalElements());
  }

  /**
   * Retrieves test details by ID.
   *
   * @param testId test ID
   * @return test detail DTO
   */
  @Transactional(readOnly = true)
  public TestDetailDTO getTestById(Long testId) {
    log.info("Fetching test with ID: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Verify access (teacher must be creator)
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to view this test");
    }

    return mapToTestDetailDTO(test);
  }

  /**
   * Updates an existing test.
   *
   * @param testId test ID
   * @param request update request
   * @return updated test DTO
   */
  public TestDTO updateTest(Long testId, CreateTestRequest request) {
    log.info("Updating test with ID: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Check access
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to update this test");
    }

    if (test.getStatus() == TestStatus.PUBLISHED) {
      throw new BusinessException("Cannot update a published test. Archive it first, then edit.");
    }

    // Validate questions count
    if (request.getQuestions().size() != request.getTotalQuestions()) {
      throw new BusinessException("Number of questions must match totalQuestions");
    }

    // Update test details
    test.setTitle(request.getTitle());
    test.setDescription(request.getDescription());
    test.setTotalQuestions(request.getTotalQuestions());
    test.setPassingScore(request.getPassingScore());
    test.setDurationMinutes(request.getDurationMinutes());
    if (request.getTestDate() != null) {
      test.setTestDate(parseDateTime(request.getTestDate()));
    }

    // Clear existing questions (uses orphanRemoval for proper cascade delete)
    test.getQuestions().clear();
    testRepository.saveAndFlush(test);

    // Recreate questions and options
    request
        .getQuestions()
        .forEach(
            qReq -> {
              Question question =
                  Question.builder()
                      .test(test)
                      .questionNumber(qReq.getQuestionNumber())
                      .questionText(qReq.getQuestionText())
                      .explanation(qReq.getExplanation())
                      .correctOptionNumber(qReq.getCorrectOptionNumber())
                      .build();

              qReq.getOptions()
                  .forEach(
                      oReq -> {
                        Option option =
                            Option.builder()
                                .question(question)
                                .optionNumber(oReq.getOptionNumber())
                                .optionText(oReq.getOptionText())
                                .build();
                        question.getOptions().add(option);
                      });

              test.addQuestion(question);
            });

    Test updatedTest = testRepository.save(test);

    log.info("Test updated successfully: {}", testId);
    return mapToTestDTO(updatedTest, updatedTest.getCreatedBy());
  }

  /**
   * Publishes a test.
   *
   * @param testId test ID
   * @return updated test DTO
   */
  public TestDTO publishTest(Long testId) {
    log.info("Publishing test with ID: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Check access
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to publish this test");
    }

    if (test.getStatus() == TestStatus.PUBLISHED) {
      throw new BusinessException("Test is already published");
    }

    test.setStatus(TestStatus.PUBLISHED);
    Test updatedTest = testRepository.save(test);

    log.info("Test published successfully: {}", testId);
    return mapToTestDTO(updatedTest, updatedTest.getCreatedBy());
  }

  /**
   * Archives a test.
   *
   * @param testId test ID
   * @return updated test DTO
   */
  public TestDTO archiveTest(Long testId) {
    log.info("Archiving test with ID: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Check access
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to archive this test");
    }

    test.setStatus(TestStatus.ARCHIVED);
    Test updatedTest = testRepository.save(test);

    log.info("Test archived successfully: {}", testId);
    return mapToTestDTO(updatedTest, updatedTest.getCreatedBy());
  }

  /**
   * Deletes a test.
   *
   * @param testId test ID
   */
  public void deleteTest(Long testId) {
    log.info("Deleting test with ID: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    // Check access
    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to delete this test");
    }

    // Cannot delete test with attempts
    long attemptCount = testAttemptRepository.countByTestId(test.getId());
    if (attemptCount > 0) {
      throw new BusinessException("Cannot delete test with existing attempts");
    }

    testRepository.delete(test);
    log.info("Test deleted successfully: {}", testId);
  }

  /**
   * Generates a guest access code for a test.
   *
   * @param testId test ID
   * @return updated test DTO with access code
   */
  public TestDTO generateAccessCode(Long testId) {
    log.info("Generating access code for test: {}", testId);

    Test test =
        testRepository
            .findById(testId)
            .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

    String currentUserEmail = securityUtil.getCurrentUserEmail();
    if (!test.getCreatedBy().getEmail().equals(currentUserEmail)) {
      throw new ForbiddenException("You don't have permission to modify this test");
    }

    // Allow access code generation for both DRAFT and PUBLISHED tests
    if (test.getStatus() != TestStatus.DRAFT && test.getStatus() != TestStatus.PUBLISHED) {
      throw new BusinessException("Can only generate access code for DRAFT or PUBLISHED tests");
    }

    String code = generateUniqueCode();
    test.setAccessCode(code);
    Test updatedTest = testRepository.save(test);

    log.info("Access code generated for test {}: {}", testId, code);
    return mapToTestDTO(updatedTest, updatedTest.getCreatedBy());
  }

  private String generateUniqueCode() {
    java.security.SecureRandom random = new java.security.SecureRandom();
    for (int i = 0; i < 10; i++) {
      String code = "guest_" + String.format("%06x", random.nextInt(0xFFFFFF + 1));
      if (!testRepository.existsByAccessCode(code)) {
        return code;
      }
    }
    throw new BusinessException("Failed to generate unique access code, please try again");
  }

  /** Maps Test entity to TestDto. */
  private TestDto mapToTestDto(Test test, User user) {
    return TestDto.builder()
        .id(test.getId())
        .title(test.getTitle())
        .description(test.getDescription())
        .totalQuestions(test.getTotalQuestions())
        .passingScore(test.getPassingScore())
        .durationMinutes(test.getDurationMinutes())
        .status(test.getStatus().name())
        .accessCode(test.getAccessCode())
        .testDate(test.getTestDate())
        .createdBy(
            TestDto.UserInfo.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build())
        .createdAt(test.getCreatedAt())
        .updatedAt(test.getUpdatedAt())
        .attemptCount(testAttemptRepository.countByTestId(test.getId()))
        .build();
  }

  /** Maps Test entity to TestDetailDto with questions. */
  private TestDetailDto mapToTestDetailDto(Test test) {
    List<TestDetailDto.QuestionDetailDto> questionDtos =
        test.getQuestions().stream()
            .map(
                q ->
                    TestDetailDto.QuestionDetailDto.builder()
                        .id(q.getId())
                        .questionNumber(q.getQuestionNumber())
                        .questionText(q.getQuestionText())
                        .explanation(q.getExplanation())
                        .correctOptionNumber(q.getCorrectOptionNumber())
                        .options(
                            q.getOptions().stream()
                                .map(
                                    o ->
                                        TestDetailDto.OptionDto.builder()
                                            .id(o.getId())
                                            .optionNumber(o.getOptionNumber())
                                            .optionText(o.getOptionText())
                                            .build())
                                .collect(Collectors.toList()))
                        .build())
            .collect(Collectors.toList());

    return TestDetailDto.builder()
        .id(test.getId())
        .title(test.getTitle())
        .description(test.getDescription())
        .totalQuestions(test.getTotalQuestions())
        .passingScore(test.getPassingScore())
        .durationMinutes(test.getDurationMinutes())
        .status(test.getStatus().name())
        .accessCode(test.getAccessCode())
        .testDate(test.getTestDate())
        .questions(questionDtos)
        .createdBy(
            TestDetailDto.UserInfo.builder()
                .id(test.getCreatedBy().getId())
                .name(test.getCreatedBy().getName())
                .email(test.getCreatedBy().getEmail())
                .build())
        .createdAt(test.getCreatedAt())
        .updatedAt(test.getUpdatedAt())
        .build();
  }

  /**
   * Parses a date string in either ISO instant format (with Z) or LocalDateTime format (without Z).
   */
  private LocalDateTime parseDateTime(String dateStr) {
    try {
      return Instant.parse(dateStr).atZone(ZoneId.systemDefault()).toLocalDateTime();
    } catch (DateTimeParseException e) {
      log.debug("Failed to parse as Instant, trying LocalDateTime: {}", dateStr);
      return LocalDateTime.parse(dateStr);
    }
  }
}
