package com.testcreator.repository;

import com.testcreator.entity.AttemptStatus;
import com.testcreator.entity.TestAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for TestAttempt entity operations.
 *
 * <p>
 * Handles test-taking sessions and proctoring data.
 *
 * @see TestAttempt
 */
@Repository
public interface TestAttemptRepository extends JpaRepository<TestAttempt, Long> {
       /**
        * Finds a test attempt by ID with the Test entity eagerly loaded.
        *
        * @param attemptId the attempt ID
        * @return Optional containing the attempt with Test
        */
       @Query("SELECT ta FROM TestAttempt ta LEFT JOIN FETCH ta.test WHERE ta.id = :attemptId")
       Optional<TestAttempt> findByIdWithTest(@Param("attemptId") Long attemptId);

       /**
        * Finds a test attempt by ID with all answers loaded.
        *
        * @param attemptId the attempt ID
        * @return Optional containing the attempt with answers
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "LEFT JOIN FETCH ta.answers " +
                     "WHERE ta.id = :attemptId")
       Optional<TestAttempt> findByIdWithAnswers(@Param("attemptId") Long attemptId);

       /**
        * Finds a test attempt by test and student.
        *
        * @param testId    the test ID
        * @param studentId the student's user ID
        * @return Optional containing the attempt if found
        */
       Optional<TestAttempt> findByTestIdAndStudentId(Long testId, Long studentId);

       /**
        * Checks if a test attempt exists for a test and student.
        *
        * @param testId    the test ID
        * @param studentId the student's user ID
        * @return true if attempt exists, false otherwise
        */
       boolean existsByTestIdAndStudentId(Long testId, Long studentId);

       /**
        * Checks if any attempts exist for a test.
        *
        * @param testId the test ID
        * @return true if attempts exist, false otherwise
        */
       boolean existsByTestId(Long testId);

       /**
        * Finds all attempts by a student.
        *
        * @param studentId the student's user ID
        * @param pageable  pagination parameters
        * @return paginated list of attempts
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "LEFT JOIN FETCH ta.test " +
                     "WHERE ta.student.id = :studentId " +
                     "ORDER BY ta.createdAt DESC")
       Page<TestAttempt> findByStudentId(@Param("studentId") Long studentId, Pageable pageable);

       /**
        * Finds all attempts for a test (for teacher results view).
        *
        * @param testId   the test ID
        * @param pageable pagination parameters
        * @return paginated list of attempts
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "LEFT JOIN FETCH ta.student " +
                     "WHERE ta.test.id = :testId " +
                     "ORDER BY ta.submittedAt DESC")
       Page<TestAttempt> findByTestId(@Param("testId") Long testId, Pageable pageable);

       /**
        * Finds in-progress attempts that have expired.
        *
        * @param cutoffTime the time before which attempts are considered expired
        * @return list of expired attempts
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "WHERE ta.status = 'IN_PROGRESS' " +
                     "AND ta.startedAt < :cutoffTime")
       List<TestAttempt> findExpiredAttempts(@Param("cutoffTime") LocalDateTime cutoffTime);

       /**
        * Counts attempts by test and status.
        *
        * @param testId the test ID
        * @param status the attempt status
        * @return count of attempts
        */
       long countByTestIdAndStatus(Long testId, AttemptStatus status);

       /**
        * Finds attempt by ID and student email (for authorization).
        *
        * @param attemptId    the attempt ID
        * @param studentEmail the student's email
        * @return Optional containing the attempt if found and owned by student
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "WHERE ta.id = :attemptId " +
                     "AND ta.student.email = :studentEmail")
       Optional<TestAttempt> findByIdAndStudentEmail(
                     @Param("attemptId") Long attemptId,
                     @Param("studentEmail") String studentEmail);

       /**
        * Calculates average score for a test.
        *
        * @param testId the test ID
        * @return average score as Double
        */
       @Query("SELECT AVG(ta.score) FROM TestAttempt ta " +
                     "WHERE ta.test.id = :testId AND ta.status = 'SUBMITTED'")
       Double calculateAverageScore(@Param("testId") Long testId);

       /**
        * Counts total attempts for a test.
        *
        * @param testId the test ID
        * @return count of attempts
        */
       long countByTestId(Long testId);

       /**
        * Counts attempts by test and student.
        *
        * @param testId    the test ID
        * @param studentId the student's user ID
        * @return count of attempts
        */
       long countByTestIdAndStudentId(Long testId, Long studentId);

       /**
        * Counts attempts by test, student, and status.
        *
        * @param testId    the test ID
        * @param studentId the student's user ID
        * @param status    the attempt status
        * @return count of attempts
        */
       long countByTestIdAndStudentIdAndStatus(Long testId, Long studentId, AttemptStatus status);

       /**
        * Finds the latest attempt by test and student.
        *
        * @param testId    the test ID
        * @param studentId the student's user ID
        * @return Optional containing the latest attempt if found
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "WHERE ta.test.id = :testId " +
                     "AND ta.student.id = :studentId " +
                     "ORDER BY ta.createdAt DESC " +
                     "LIMIT 1")
       Optional<TestAttempt> findLatestAttemptByTestAndStudent(
                     @Param("testId") Long testId,
                     @Param("studentId") Long studentId);

       /**
        * Finds submitted attempts by student (SUBMITTED status only).
        *
        * @param studentId the student's user ID
        * @param pageable  pagination parameters
        * @return paginated list of submitted attempts
        */
       @Query("SELECT ta FROM TestAttempt ta " +
                     "LEFT JOIN FETCH ta.test " +
                     "WHERE ta.student.id = :studentId " +
                     "AND ta.status = 'SUBMITTED' " +
                     "ORDER BY ta.submittedAt DESC")
       Page<TestAttempt> findSubmittedAttemptsByStudent(@Param("studentId") Long studentId, Pageable pageable);
}
