package com.testcreator.repository;

import com.testcreator.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for StudentAnswer entity operations.
 *
 * @see StudentAnswer
 */
@Repository
public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    /**
     * Finds all answers for a test attempt.
     *
     * @param attemptId the test attempt ID
     * @return list of student answers
     */
    List<StudentAnswer> findByAttemptId(Long attemptId);

    /**
     * Finds an answer by attempt and question.
     *
     * @param attemptId the test attempt ID
     * @param questionId the question ID
     * @return Optional containing the answer if found
     */
    Optional<StudentAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    /**
     * Counts answers for a test attempt.
     *
     * @param attemptId the test attempt ID
     * @return count of answers
     */
    long countByAttemptId(Long attemptId);

    /**
     * Counts correct answers for a test attempt.
     *
     * @param attemptId the test attempt ID
     * @return count of correct answers
     */
    @Query("SELECT COUNT(sa) FROM StudentAnswer sa " +
           "WHERE sa.attempt.id = :attemptId AND sa.isCorrect = true")
    long countCorrectAnswersByAttemptId(@Param("attemptId") Long attemptId);

    /**
     * Deletes all answers for a test attempt.
     *
     * @param attemptId the test attempt ID
     */
    void deleteByAttemptId(Long attemptId);

    /**
     * Checks if an answer exists for an attempt and question.
     *
     * @param attemptId the test attempt ID
     * @param questionId the question ID
     * @return true if answer exists, false otherwise
     */
    boolean existsByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    /**
     * Atomically inserts or updates a student answer.
     * Uses PostgreSQL ON CONFLICT to avoid race conditions with concurrent writes.
     *
     * @param attemptId      the test attempt ID
     * @param questionId     the question ID
     * @param selectedOption the selected option number
     * @param isCorrect      whether the answer is correct
     * @param answeredAt     when the answer was submitted
     */
    @Modifying
    @Query(value = "INSERT INTO student_answers (attempt_id, question_id, selected_option, is_correct, answered_at) " +
                   "VALUES (:attemptId, :questionId, :selectedOption, :isCorrect, :answeredAt) " +
                   "ON CONFLICT (attempt_id, question_id) " +
                   "DO UPDATE SET selected_option = :selectedOption, is_correct = :isCorrect, answered_at = :answeredAt",
           nativeQuery = true)
    void upsertAnswer(@Param("attemptId") Long attemptId,
                       @Param("questionId") Long questionId,
                       @Param("selectedOption") Integer selectedOption,
                       @Param("isCorrect") boolean isCorrect,
                       @Param("answeredAt") LocalDateTime answeredAt);
}
