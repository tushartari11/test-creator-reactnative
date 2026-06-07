package com.testcreator.service;

import com.testcreator.dto.student.TestResultDto;
import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.Question;
import com.testcreator.entity.ResultStatus;
import com.testcreator.entity.StudentAnswer;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestAttempt;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for calculating test results and scores.
 *
 * <p>Handles score calculation, result determination, and analytics.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class ResultService {

  private final StudentAnswerRepository studentAnswerRepository;
  private final QuestionRepository questionRepository;
  private final TestAttemptRepository testAttemptRepository;

  /**
   * Calculates test result for an attempt.
   *
   * @param attempt the test attempt
   * @return test result with score and detailed analysis
   */
  public TestResultDto calculateResult(TestAttempt attempt) {
    log.info("Calculating result for attempt: {}", attempt.getId());

    Test test = attempt.getTest();
    List<StudentAnswer> answers = attempt.getAnswers();

    // Calculate correctness
    int correctCount = 0;
    int wrongCount = 0;
    int skippedCount = test.getTotalQuestions() - answers.size();

    List<TestResultDto.ReviewQuestionDto> reviewQuestions = new ArrayList<>();

    for (Question question : test.getQuestions()) {
      // Find student's answer for this question
      StudentAnswer studentAnswer =
          answers.stream()
              .filter(a -> a.getQuestion().getId().equals(question.getId()))
              .findFirst()
              .orElse(null);

      int selectedOption = studentAnswer != null ? studentAnswer.getSelectedOption() : 0;
      boolean isCorrect = selectedOption == question.getCorrectOptionNumber();

      if (studentAnswer != null) {
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else {
        skippedCount++;
      }

      // Build review question with answer
      List<TestResultDto.ReviewOptionDto> optionDtos =
          question.getOptions().stream()
              .map(
                  option ->
                      TestResultDto.ReviewOptionDto.builder()
                          .optionNumber(option.getOptionNumber())
                          .optionText(option.getOptionText())
                          .isCorrect(
                              option.getOptionNumber().equals(question.getCorrectOptionNumber()))
                          .wasSelected(option.getOptionNumber().equals(selectedOption))
                          .build())
              .collect(Collectors.toList());

      TestResultDto.ReviewQuestionDto reviewQuestion =
          TestResultDto.ReviewQuestionDto.builder()
              .id(question.getId())
              .questionNumber(question.getQuestionNumber())
              .questionText(question.getQuestionText())
              .explanation(question.getExplanation())
              .correctOption(question.getCorrectOptionNumber())
              .selectedOption(selectedOption > 0 ? selectedOption : null)
              .isCorrect(isCorrect)
              .options(optionDtos)
              .build();

      reviewQuestions.add(reviewQuestion);
    }

    // Calculate score percentage
    double score = (double) correctCount / test.getTotalQuestions() * 100;
    score = Math.round(score * 100.0) / 100.0; // Round to 2 decimal places

    // Determine pass/fail
    String result = score >= test.getPassingScore() ? "PASS" : "FAIL";

    // Calculate time taken (null-safe)
    long secondsTaken = 0;
    if (attempt.getStartedAt() != null && attempt.getSubmittedAt() != null) {
      secondsTaken = ChronoUnit.SECONDS.between(attempt.getStartedAt(), attempt.getSubmittedAt());
    }

    // Build result DTO
    TestResultDto resultDto =
        TestResultDto.builder()
            .attemptId(attempt.getId())
            .testId(test.getId())
            .testTitle(test.getTitle())
            .totalQuestions(test.getTotalQuestions())
            .answeredQuestions(answers.size())
            .correctAnswers(correctCount)
            .wrongAnswers(wrongCount)
            .skippedQuestions(skippedCount)
            .score(score)
            .result(result)
            .passingScore(test.getPassingScore())
            .submittedAt(attempt.getSubmittedAt())
            .timeTakenSeconds((int) secondsTaken)
            .reviewQuestions(reviewQuestions)
            .build();

    log.info("Result calculated - Score: {}, Result: {}", score, result);

    return resultDto;
  }

  /**
   * Gets detailed result for a submitted attempt.
   *
   * @param attempt the submitted attempt
   * @return detailed test result
   */
  public TestResultDto getDetailedResult(TestAttempt attempt) {
    return calculateResult(attempt);
  }

  /**
   * Calculates platform-wide analytics for a test.
   *
   * @param test the test
   * @return analytics summary
   */
  public Map<String, Object> getTestAnalytics(Test test) {
    log.info("Calculating analytics for test: {}", test.getId());

    List<TestAttempt> submittedAttempts =
        testAttemptRepository
            .findByTestId(test.getId(), PageRequest.of(0, Integer.MAX_VALUE))
            .stream()
            .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
            .collect(Collectors.toList());

    if (submittedAttempts.isEmpty()) {
      return new HashMap<>();
    }

    // Calculate statistics
    final double averageScore =
        submittedAttempts.stream()
            .mapToDouble(a -> a.getScore() != null ? a.getScore() : 0)
            .average()
            .orElse(0);

    long passCount =
        submittedAttempts.stream().filter(a -> a.getResult() == ResultStatus.PASS).count();

    final double passPercentage = (double) passCount / submittedAttempts.size() * 100;

    // Question-wise analytics
    Map<Integer, Integer> questionCorrectCount = new HashMap<>();
    for (int i = 1; i <= test.getTotalQuestions(); i++) {
      questionCorrectCount.put(i, 0);
    }

    for (TestAttempt attempt : submittedAttempts) {
      for (StudentAnswer answer : attempt.getAnswers()) {
        Question question = answer.getQuestion();
        int correctAnswers = questionCorrectCount.getOrDefault(question.getQuestionNumber(), 0);
        if (answer.getSelectedOption().equals(question.getCorrectOptionNumber())) {
          questionCorrectCount.put(question.getQuestionNumber(), correctAnswers + 1);
        }
      }
    }

    Map<String, Object> analytics = new HashMap<>();
    analytics.put("totalAttempts", submittedAttempts.size());
    analytics.put("averageScore", Math.round(averageScore * 100.0) / 100.0);
    analytics.put("passCount", passCount);
    analytics.put("failCount", submittedAttempts.size() - passCount);
    analytics.put("passPercentage", Math.round(passPercentage * 100.0) / 100.0);
    analytics.put("questionAnalytics", questionCorrectCount);

    return analytics;
  }
}
