package com.testcreator.service;

import com.testcreator.dto.student.AvailableTestDTO;
import com.testcreator.entity.*;
import com.testcreator.exception.BusinessException;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.*;
import com.testcreator.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing student test operations.
 *
 * <p>
 * Handles viewing available tests, checking attempt eligibility, and retrieving
 * results.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StudentTestService {

    private final TestRepository testRepository;
    private final TestAttemptRepository testAttemptRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;
    private static final int MAX_ATTEMPTS_PER_TEST = 1; // Initially allow 1 attempt, can be made configurable

    /**
     * Gets list of available tests for the student.
     *
     * @param pageable pagination info
     * @return page of available tests
     */
    @Transactional(readOnly = true)
    public Page<AvailableTestDTO> getAvailableTests(Pageable pageable) {
        log.info("Fetching available tests for student");

        String currentUserEmail = securityUtil.getCurrentUserEmail();
        User student = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Only get published tests
        Page<Test> publishedTests = testRepository.findPublishedTests(pageable);

        List<AvailableTestDTO> dtos = publishedTests.getContent().stream()
                .map(test -> {
                    // Check if student has already attempted this test
                    long attemptCount = testAttemptRepository.countByTestIdAndStudentId(test.getId(), student.getId());
                    Boolean alreadyAttempted = attemptCount > 0;

                    // Get previous result if any
                    Integer previousScore = null;
                    String previousResult = null;

                    if (alreadyAttempted) {
                        TestAttempt lastAttempt = testAttemptRepository.findLatestAttemptByTestAndStudent(
                                test.getId(), student.getId()).orElse(null);

                        if (lastAttempt != null && lastAttempt.getStatus() == AttemptStatus.SUBMITTED) {
                            previousScore = lastAttempt.getScore();
                            previousResult = lastAttempt.getResult().name();
                        }
                    }

                    return AvailableTestDTO.builder()
                            .id(test.getId())
                            .title(test.getTitle())
                            .description(test.getDescription())
                            .totalQuestions(test.getTotalQuestions())
                            .durationMinutes(test.getDurationMinutes())
                            .passingScore(test.getPassingScore())
                            .testDate(test.getTestDate())
                            .teacherName(test.getCreatedBy().getName())
                            .alreadyAttempted(alreadyAttempted)
                            .previousScore(previousScore)
                            .previousResult(previousResult)
                            .build();
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, publishedTests.getTotalElements());
    }

    /**
     * Validates if student can attempt a test.
     *
     * @param testId  test ID
     * @param student the student entity
     * @throws BusinessException if student cannot attempt the test
     */
    public void validateCanAttempt(Long testId, User student) {
        log.info("Validating can attempt for student: {} and test: {}", student.getId(), testId);

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));

        // Test must be published
        if (test.getStatus() != TestStatus.PUBLISHED) {
            throw new BusinessException("This test is not available for attempting");
        }

        // Check if test date has passed (if specified)
        if (test.getTestDate() != null && LocalDateTime.now().isAfter(test.getTestDate())) {
            throw new BusinessException("This test is no longer available");
        }

        // Check if student has already attempted this test (configurable limit)
        long attemptCount = testAttemptRepository.countByTestIdAndStudentId(testId, student.getId());
        if (attemptCount >= MAX_ATTEMPTS_PER_TEST) {
            throw new BusinessException("You have already attempted this test");
        }
    }

    /**
     * Checks if a test is available.
     *
     * @param testId test ID
     * @return true if available, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean isTestAvailable(Long testId) {
        Test test = testRepository.findById(testId)
                .orElse(null);

        if (test == null) {
            return false;
        }

        // Must be published
        if (test.getStatus() != TestStatus.PUBLISHED) {
            return false;
        }

        // Check date if specified
        if (test.getTestDate() != null && LocalDateTime.now().isAfter(test.getTestDate())) {
            return false;
        }

        return true;
    }

    /**
     * Gets test details by ID for student view.
     *
     * @param testId test ID
     * @return test with questions and options
     */
    @Transactional(readOnly = true)
    public Test getTestWithQuestions(Long testId) {
        return testRepository.findByIdWithQuestionsAndOptions(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found with id: " + testId));
    }
}
