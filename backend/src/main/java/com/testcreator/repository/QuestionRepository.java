package com.testcreator.repository;

import com.testcreator.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Question entity operations.
 *
 * @see Question
 */
@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    /**
     * Finds all questions for a test with options loaded.
     *
     * @param testId the test ID
     * @return list of questions with options
     */
    @Query("SELECT q FROM Question q " +
           "LEFT JOIN FETCH q.options " +
           "WHERE q.test.id = :testId " +
           "ORDER BY q.questionNumber ASC")
    List<Question> findByTestIdWithOptions(@Param("testId") Long testId);

    /**
     * Finds a question by test ID and question number.
     *
     * @param testId the test ID
     * @param questionNumber the question number
     * @return Optional containing the question if found
     */
    Optional<Question> findByTestIdAndQuestionNumber(Long testId, Integer questionNumber);

    /**
     * Counts questions for a specific test.
     *
     * @param testId the test ID
     * @return count of questions
     */
    long countByTestId(Long testId);

    /**
     * Deletes all questions for a test.
     *
     * @param testId the test ID
     */
    void deleteByTestId(Long testId);
}
