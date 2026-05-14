package com.testcreator.repository;

import com.testcreator.entity.Test;
import com.testcreator.entity.TestStatus;
import com.testcreator.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Test entity operations.
 *
 * <p>
 * Provides optimized queries for test management including
 * JOIN FETCH to avoid N+1 queries and DTO projections for list views.
 *
 * @see Test
 */
@Repository
public interface TestRepository extends JpaRepository<Test, Long> {

       /**
        * Finds a test by ID with all questions and options loaded (avoids N+1
        * queries).
        *
        * @param testId the test ID
        * @return Optional containing the test with questions and options
        */
       @Query("SELECT t FROM Test t " +
                     "LEFT JOIN FETCH t.questions q " +
                     "LEFT JOIN FETCH q.options " +
                     "LEFT JOIN FETCH t.createdBy " +
                     "WHERE t.id = :testId")
       Optional<Test> findByIdWithQuestionsAndOptions(@Param("testId") Long testId);

       /**
        * Finds tests created by a specific teacher with pagination.
        *
        * @param createdBy the teacher user entity
        * @param pageable  pagination parameters
        * @return paginated list of tests
        */
       Page<Test> findByCreatedBy(User createdBy, Pageable pageable);

       /**
        * Finds tests by teacher and status with pagination.
        *
        * @param createdBy the teacher user entity
        * @param status    the test status
        * @param pageable  pagination parameters
        * @return paginated list of tests
        */
       Page<Test> findByCreatedByAndStatus(User createdBy, TestStatus status, Pageable pageable);

       /**
        * Finds tests created by a specific teacher with pagination.
        *
        * @param teacherId the teacher's user ID
        * @param pageable  pagination parameters
        * @return paginated list of tests
        */
       @Query("SELECT t FROM Test t WHERE t.createdBy.id = :teacherId ORDER BY t.createdAt DESC")
       Page<Test> findByCreatedById(@Param("teacherId") Long teacherId, Pageable pageable);

       /**
        * Finds tests by teacher email and status with pagination.
        *
        * @param email    the teacher's email
        * @param status   the test status (nullable for all statuses)
        * @param pageable pagination parameters
        * @return paginated list of tests
        */
       @Query("SELECT t FROM Test t " +
                     "WHERE t.createdBy.email = :email " +
                     "AND (:status IS NULL OR t.status = :status) " +
                     "ORDER BY t.createdAt DESC")
       Page<Test> findByTeacherEmailAndStatus(
                     @Param("email") String email,
                     @Param("status") TestStatus status,
                     Pageable pageable);

       /**
        * Finds published tests available between date range.
        *
        * @param startDate start of date range
        * @param endDate   end of date range
        * @return list of published tests in the date range
        */
       @Query("SELECT t FROM Test t " +
                     "WHERE t.status = 'PUBLISHED' " +
                     "AND t.testDate BETWEEN :startDate AND :endDate " +
                     "ORDER BY t.testDate ASC")
       List<Test> findPublishedTestsBetween(
                     @Param("startDate") LocalDateTime startDate,
                     @Param("endDate") LocalDateTime endDate);

       /**
        * Finds a test by ID and creator email (for authorization).
        *
        * @param id    the test ID
        * @param email the creator's email
        * @return Optional containing the test if found and owned by the user
        */
       @Query("SELECT t FROM Test t WHERE t.id = :id AND t.createdBy.email = :email")
       Optional<Test> findByIdAndCreatedByEmail(@Param("id") Long id, @Param("email") String email);

       /**
        * Checks if a test exists with the given title for a specific teacher.
        *
        * @param title the test title
        * @param email the teacher's email
        * @return true if test exists, false otherwise
        */
       boolean existsByTitleAndCreatedByEmail(String title, String email);

       /**
        * Counts tests by creator and status.
        *
        * @param teacherId the teacher's user ID
        * @param status    the test status
        * @return count of tests
        */
       @Query("SELECT COUNT(t) FROM Test t WHERE t.createdBy.id = :teacherId AND t.status = :status")
       long countByTeacherAndStatus(@Param("teacherId") Long teacherId, @Param("status") TestStatus status);

       /**
        * Archives old published tests (bulk operation).
        *
        * @param daysAgo number of days in the past
        * @return number of tests archived
        */
       @Modifying
       @Query("UPDATE Test t SET t.status = 'ARCHIVED' " +
                     "WHERE t.testDate < :cutoffDate " +
                     "AND t.status = 'PUBLISHED'")
       int archiveOldTests(@Param("cutoffDate") LocalDateTime cutoffDate);

       /**
        * Finds all published tests (for students).
        *
        * @param pageable pagination parameters
        * @return paginated list of published tests
        */
       @Query("SELECT t FROM Test t WHERE t.status = 'PUBLISHED' ORDER BY t.testDate DESC")
       Page<Test> findPublishedTests(Pageable pageable);

       /**
        * Checks if a test with the given access code exists.
        *
        * @param accessCode the access code
        * @return true if access code is already in use
        */
       boolean existsByAccessCode(String accessCode);

       /**
        * Finds a published test by its access code.
        *
        * @param accessCode the access code
        * @return Optional containing the test if found
        */
       Optional<Test> findByAccessCodeAndStatus(String accessCode, TestStatus status);
}
