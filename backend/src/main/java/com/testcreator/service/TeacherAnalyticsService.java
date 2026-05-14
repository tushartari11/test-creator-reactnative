package com.testcreator.service;

import com.testcreator.dto.analytics.QuestionAnalyticsDTO;
import com.testcreator.dto.analytics.StudentAttemptSummaryDTO;
import com.testcreator.dto.analytics.TestAnalyticsDTO;
import com.testcreator.dto.analytics.TestSummaryDTO;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.Question;
import com.testcreator.entity.ResultStatus;
import com.testcreator.entity.StudentAnswer;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestAttempt;
import com.testcreator.exception.ResourceNotFoundException;
import com.testcreator.repository.ProctoringViolationRepository;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for generating test analytics and reports for teachers.
 *
 * <p>
 * Provides comprehensive analytics including score distributions,
 * question analysis, and student performance summaries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeacherAnalyticsService {

    private final TestRepository testRepository;
    private final TestAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final ProctoringViolationRepository violationRepository;

    /**
     * Gets list of tests with summary analytics for the teacher.
     *
     * @param teacherEmail the teacher's email
     * @param pageable     pagination parameters
     * @return page of test summaries
     */
    public Page<TestSummaryDTO> getTestSummaries(String teacherEmail, Pageable pageable) {
        log.info("Getting test summaries for teacher: {}", teacherEmail);

        return testRepository.findByTeacherEmailAndStatus(teacherEmail, null, pageable)
                .map(this::mapToTestSummary);
    }

    /**
     * Gets comprehensive analytics for a specific test.
     *
     * @param testId       the test ID
     * @param teacherEmail the teacher's email (for authorization)
     * @return full test analytics
     */
    public TestAnalyticsDTO getTestAnalytics(Long testId, String teacherEmail) {
        log.info("Getting analytics for test: {}", testId);

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));

        // Verify ownership
        if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
            throw new ResourceNotFoundException("Test not found: " + testId);
        }

        // Get all submitted attempts
        List<TestAttempt> attempts = attemptRepository.findByTestId(testId, Pageable.unpaged()).getContent();
        List<TestAttempt> submittedAttempts = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
                .collect(Collectors.toList());

        // Calculate statistics
        List<Double> scores = submittedAttempts.stream()
                .map(a -> a.getScore().doubleValue())
                .sorted()
                .collect(Collectors.toList());

        Double averageScore = scores.isEmpty() ? 0.0 : scores.stream().mapToDouble(d -> d).average().orElse(0);
        Double medianScore = calculateMedian(scores);
        Double highestScore = scores.isEmpty() ? 0.0 : Collections.max(scores);
        Double lowestScore = scores.isEmpty() ? 0.0 : Collections.min(scores);
        Double standardDeviation = calculateStandardDeviation(scores, averageScore);

        long passCount = submittedAttempts.stream()
                .filter(a -> a.getResult() == ResultStatus.PASS)
                .count();
        long failCount = submittedAttempts.stream()
                .filter(a -> a.getResult() == ResultStatus.FAIL)
                .count();
        double passRate = submittedAttempts.isEmpty() ? 0.0 : (passCount * 100.0 / submittedAttempts.size());

        // Calculate average time taken
        Long averageTimeTaken = submittedAttempts.stream()
                .filter(a -> a.getStartedAt() != null && a.getSubmittedAt() != null)
                .mapToLong(a -> ChronoUnit.SECONDS.between(a.getStartedAt(), a.getSubmittedAt()))
                .boxed()
                .collect(Collectors.averagingLong(l -> l))
                .longValue();

        // Score distribution
        Map<String, Integer> scoreDistribution = calculateScoreDistribution(scores);

        // Question analytics
        List<QuestionAnalyticsDTO> questionAnalytics = calculateQuestionAnalytics(test, submittedAttempts);

        // Student results
        List<StudentAttemptSummaryDTO> studentResults = submittedAttempts.stream()
                .map(this::mapToStudentAttemptSummary)
                .collect(Collectors.toList());

        // Proctoring stats
        long studentsWithViolations = attempts.stream()
                .filter(a -> violationRepository.countByAttemptId(a.getId()) > 0)
                .count();
        long totalViolations = attempts.stream()
                .mapToLong(a -> violationRepository.countByAttemptId(a.getId()))
                .sum();

        return TestAnalyticsDTO.builder()
                .testId(test.getId())
                .testTitle(test.getTitle())
                .status(test.getStatus().name())
                .totalAttempts(attempts.size())
                .completedAttempts(submittedAttempts.size())
                .inProgressAttempts((int) attempts.stream()
                        .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS).count())
                .averageScore(round(averageScore))
                .medianScore(round(medianScore))
                .highestScore(round(highestScore))
                .lowestScore(round(lowestScore))
                .standardDeviation(round(standardDeviation))
                .passCount((int) passCount)
                .failCount((int) failCount)
                .passRate(round(passRate))
                .passingScore(test.getPassingScore())
                .totalQuestions(test.getTotalQuestions())
                .durationMinutes(test.getDurationMinutes())
                .averageTimeTaken(averageTimeTaken)
                .scoreDistribution(scoreDistribution)
                .questionAnalytics(questionAnalytics)
                .studentResults(studentResults)
                .studentsWithViolations((int) studentsWithViolations)
                .totalViolations(totalViolations)
                .createdAt(test.getCreatedAt())
                .testDate(test.getTestDate())
                .build();
    }

    /**
     * Gets student results for a test (paginated).
     *
     * @param testId       the test ID
     * @param teacherEmail the teacher's email
     * @param pageable     pagination parameters
     * @return page of student results
     */
    public Page<StudentAttemptSummaryDTO> getStudentResults(Long testId, String teacherEmail, Pageable pageable) {
        log.info("Getting student results for test: {}", testId);

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));

        if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
            throw new ResourceNotFoundException("Test not found: " + testId);
        }

        return attemptRepository.findByTestId(testId, pageable)
                .map(this::mapToStudentAttemptSummary);
    }

    /**
     * Exports test results as CSV string.
     *
     * @param testId       the test ID
     * @param teacherEmail the teacher's email
     * @return CSV formatted string
     */
    public String exportResultsToCSV(Long testId, String teacherEmail) {
        log.info("Exporting results to CSV for test: {}", testId);

        Test test = testRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Test not found: " + testId));

        if (!test.getCreatedBy().getEmail().equals(teacherEmail)) {
            throw new ResourceNotFoundException("Test not found: " + testId);
        }

        List<TestAttempt> attempts = attemptRepository.findByTestId(testId, Pageable.unpaged()).getContent();

        StringBuilder csv = new StringBuilder();

        // Header
        csv.append(
                "Student Name,Email,Score (%),Correct,Wrong,Skipped,Result,Status,Started At,Submitted At,Time Taken (sec),Violations,Tab Switches\n");

        // Data rows
        for (TestAttempt attempt : attempts) {
            String studentName = attempt.getStudent() != null ? attempt.getStudent().getName() : "Guest";
            String studentEmail = attempt.getStudent() != null ? attempt.getStudent().getEmail() : "N/A";
            int skipped = test.getTotalQuestions() - attempt.getCorrectAnswers() - attempt.getWrongAnswers();
            long timeTaken = attempt.getStartedAt() != null && attempt.getSubmittedAt() != null
                    ? ChronoUnit.SECONDS.between(attempt.getStartedAt(), attempt.getSubmittedAt())
                    : 0;
            long violations = violationRepository.countByAttemptId(attempt.getId());

            csv.append(String.format("\"%s\",\"%s\",%.2f,%d,%d,%d,%s,%s,%s,%s,%d,%d,%d\n",
                    escapeCsvValue(studentName),
                    escapeCsvValue(studentEmail),
                    attempt.getScore().doubleValue(),
                    attempt.getCorrectAnswers(),
                    attempt.getWrongAnswers(),
                    skipped,
                    attempt.getResult() != null ? attempt.getResult().name() : "N/A",
                    attempt.getStatus().name(),
                    attempt.getStartedAt() != null ? attempt.getStartedAt().toString() : "N/A",
                    attempt.getSubmittedAt() != null ? attempt.getSubmittedAt().toString() : "N/A",
                    timeTaken,
                    violations,
                    attempt.getTabSwitchCount()));
        }

        return csv.toString();
    }

    // ========== Helper Methods ==========

    private TestSummaryDTO mapToTestSummary(Test test) {
        long totalAttempts = attemptRepository.countByTestId(test.getId());
        long completedAttempts = attemptRepository.countByTestIdAndStatus(test.getId(), AttemptStatus.SUBMITTED);
        Double averageScore = attemptRepository.calculateAverageScore(test.getId());

        // Calculate pass rate
        List<TestAttempt> submitted = attemptRepository.findByTestId(test.getId(), Pageable.unpaged())
                .getContent().stream()
                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
                .collect(Collectors.toList());

        long passCount = submitted.stream().filter(a -> a.getResult() == ResultStatus.PASS).count();
        double passRate = submitted.isEmpty() ? 0.0 : (passCount * 100.0 / submitted.size());

        return TestSummaryDTO.builder()
                .testId(test.getId())
                .testTitle(test.getTitle())
                .status(test.getStatus().name())
                .totalQuestions(test.getTotalQuestions())
                .durationMinutes(test.getDurationMinutes())
                .passingScore(test.getPassingScore())
                .totalAttempts((int) totalAttempts)
                .completedAttempts((int) completedAttempts)
                .averageScore(averageScore != null ? round(averageScore) : 0.0)
                .passRate(round(passRate))
                .testDate(test.getTestDate())
                .createdAt(test.getCreatedAt())
                .build();
    }

    private StudentAttemptSummaryDTO mapToStudentAttemptSummary(TestAttempt attempt) {
        int totalQuestions = attempt.getTest().getTotalQuestions();
        int skipped = totalQuestions - attempt.getCorrectAnswers() - attempt.getWrongAnswers();

        Long timeTaken = null;
        if (attempt.getStartedAt() != null && attempt.getSubmittedAt() != null) {
            timeTaken = ChronoUnit.SECONDS.between(attempt.getStartedAt(), attempt.getSubmittedAt());
        }

        long violations = violationRepository.countByAttemptId(attempt.getId());
        boolean hasCritical = violationRepository.hasCriticalViolations(attempt.getId());

        return StudentAttemptSummaryDTO.builder()
                .attemptId(attempt.getId())
                .studentId(attempt.getStudent() != null ? attempt.getStudent().getId() : null)
                .studentName(attempt.getStudent() != null ? attempt.getStudent().getName() : "Guest")
                .studentEmail(attempt.getStudent() != null ? attempt.getStudent().getEmail() : null)
                .isGuest(attempt.getStudent() == null)
                .score(attempt.getScore().doubleValue())
                .correctAnswers(attempt.getCorrectAnswers())
                .wrongAnswers(attempt.getWrongAnswers())
                .skippedAnswers(skipped)
                .result(attempt.getResult() != null ? attempt.getResult().name() : null)
                .status(attempt.getStatus().name())
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .timeTakenSeconds(timeTaken)
                .violationCount(violations)
                .hasCriticalViolations(hasCritical)
                .tabSwitchCount(attempt.getTabSwitchCount())
                .build();
    }

    private List<QuestionAnalyticsDTO> calculateQuestionAnalytics(Test test, List<TestAttempt> attempts) {
        List<QuestionAnalyticsDTO> analytics = new ArrayList<>();
        int totalAttempts = attempts.size();

        for (Question question : test.getQuestions()) {
            Map<Integer, Integer> answerDistribution = new HashMap<>();
            int correctCount = 0;
            int wrongCount = 0;
            int skippedCount = 0;

            // Initialize distribution
          for (int i = 1; i <= 3; i++) {
                answerDistribution.put(i, 0);
            }

            for (TestAttempt attempt : attempts) {
                Optional<StudentAnswer> answer = attempt.getAnswers().stream()
                        .filter(a -> a.getQuestion().getId().equals(question.getId()))
                        .findFirst();

                if (answer.isPresent()) {
                    int selected = answer.get().getSelectedOption();
                    answerDistribution.merge(selected, 1, Integer::sum);

                    if (selected == question.getCorrectOptionNumber()) {
                        correctCount++;
                    } else {
                        wrongCount++;
                    }
                } else {
                    skippedCount++;
                }
            }

            double correctPercentage = totalAttempts == 0 ? 0.0 : (correctCount * 100.0 / totalAttempts);

            analytics.add(QuestionAnalyticsDTO.builder()
                    .questionId(question.getId())
                    .questionNumber(question.getQuestionNumber())
                    .questionText(truncateText(question.getQuestionText(), 100))
                    .correctOption(question.getCorrectOptionNumber())
                    .correctCount(correctCount)
                    .wrongCount(wrongCount)
                    .skippedCount(skippedCount)
                    .correctPercentage(round(correctPercentage))
                    .answerDistribution(answerDistribution)
                    .difficulty(QuestionAnalyticsDTO.calculateDifficulty(correctPercentage))
                    .build());
        }

        return analytics;
    }

    private Map<String, Integer> calculateScoreDistribution(List<Double> scores) {
        Map<String, Integer> distribution = new LinkedHashMap<>();
        distribution.put("0-10", 0);
        distribution.put("10-20", 0);
        distribution.put("20-30", 0);
        distribution.put("30-40", 0);
        distribution.put("40-50", 0);
        distribution.put("50-60", 0);
        distribution.put("60-70", 0);
        distribution.put("70-80", 0);
        distribution.put("80-90", 0);
        distribution.put("90-100", 0);

        for (Double score : scores) {
            String range;
            if (score >= 90)
                range = "90-100";
            else if (score >= 80)
                range = "80-90";
            else if (score >= 70)
                range = "70-80";
            else if (score >= 60)
                range = "60-70";
            else if (score >= 50)
                range = "50-60";
            else if (score >= 40)
                range = "40-50";
            else if (score >= 30)
                range = "30-40";
            else if (score >= 20)
                range = "20-30";
            else if (score >= 10)
                range = "10-20";
            else
                range = "0-10";

            distribution.merge(range, 1, Integer::sum);
        }

        return distribution;
    }

    private Double calculateMedian(List<Double> sortedScores) {
        if (sortedScores.isEmpty())
            return 0.0;
        int size = sortedScores.size();
        if (size % 2 == 0) {
            return (sortedScores.get(size / 2 - 1) + sortedScores.get(size / 2)) / 2.0;
        }
        return sortedScores.get(size / 2);
    }

    private Double calculateStandardDeviation(List<Double> scores, Double mean) {
        if (scores.isEmpty())
            return 0.0;
        double variance = scores.stream()
                .mapToDouble(s -> Math.pow(s - mean, 2))
                .average()
                .orElse(0);
        return Math.sqrt(variance);
    }

    private Double round(Double value) {
        if (value == null)
            return 0.0;
        return Math.round(value * 100.0) / 100.0;
    }

    private String truncateText(String text, int maxLength) {
        if (text == null)
            return "";
        if (text.length() <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + "...";
    }

    private String escapeCsvValue(String value) {
        if (value == null)
            return "";
        return value.replace("\"", "\"\"");
    }
}
