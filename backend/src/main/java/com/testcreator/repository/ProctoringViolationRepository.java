package com.testcreator.repository;

import com.testcreator.entity.ProctoringViolation;
import com.testcreator.entity.ViolationSeverity;
import com.testcreator.entity.ViolationType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for proctoring violation operations.
 *
 * <p>Provides methods for querying and analyzing violations during test attempts for both students
 * and teachers.
 *
 * @see ProctoringViolation
 */
@Repository
public interface ProctoringViolationRepository extends JpaRepository<ProctoringViolation, Long> {

  /**
   * Finds all violations for a specific attempt, ordered by creation time.
   *
   * @param attemptId the attempt ID
   * @return list of violations chronologically ordered
   */
  @Query(
      "SELECT v FROM ProctoringViolation v WHERE v.attempt.id = :attemptId ORDER BY v.createdAt"
          + " DESC")
  List<ProctoringViolation> findAllByAttemptIdOrderByCreatedAtDesc(
      @Param("attemptId") Long attemptId);

  /**
   * Finds violations for an attempt with pagination.
   *
   * @param attemptId the attempt ID
   * @param pageable pagination parameters
   * @return page of violations
   */
  Page<ProctoringViolation> findByAttemptId(Long attemptId, Pageable pageable);

  /**
   * Counts total violations for an attempt.
   *
   * @param attemptId the attempt ID
   * @return count of violations
   */
  long countByAttemptId(Long attemptId);

  /**
   * Counts violations by type for an attempt.
   *
   * @param attemptId the attempt ID
   * @param violationType the type of violation
   * @return count of violations of that type
   */
  long countByAttemptIdAndViolationType(Long attemptId, ViolationType violationType);

  /**
   * Counts violations by severity for an attempt.
   *
   * @param attemptId the attempt ID
   * @param severity the severity level
   * @return count of violations with that severity
   */
  long countByAttemptIdAndSeverity(Long attemptId, ViolationSeverity severity);

  /**
   * Finds violations of a specific severity or higher.
   *
   * @param attemptId the attempt ID
   * @param severity minimum severity
   * @return list of violations
   */
  @Query(
      """
            SELECT v FROM ProctoringViolation v
            WHERE v.attempt.id = :attemptId
            AND v.severity IN :severities
            ORDER BY v.createdAt DESC
            """)
  List<ProctoringViolation> findByAttemptIdAndSeverityIn(
      @Param("attemptId") Long attemptId, @Param("severities") List<ViolationSeverity> severities);

  /**
   * Gets violation count summary by type for an attempt.
   *
   * @param attemptId the attempt ID
   * @return list of [ViolationType, count] arrays
   */
  @Query(
      """
            SELECT v.violationType, COUNT(v)
            FROM ProctoringViolation v
            WHERE v.attempt.id = :attemptId
            GROUP BY v.violationType
            """)
  List<Object[]> getViolationCountsByType(@Param("attemptId") Long attemptId);

  /**
   * Gets violation count summary by severity for an attempt.
   *
   * @param attemptId the attempt ID
   * @return list of [ViolationSeverity, count] arrays
   */
  @Query(
      """
            SELECT v.severity, COUNT(v)
            FROM ProctoringViolation v
            WHERE v.attempt.id = :attemptId
            GROUP BY v.severity
            """)
  List<Object[]> getViolationCountsBySeverity(@Param("attemptId") Long attemptId);

  /**
   * Finds violations within a time range for an attempt.
   *
   * @param attemptId the attempt ID
   * @param start start time
   * @param end end time
   * @return list of violations in the time range
   */
  @Query(
      """
            SELECT v FROM ProctoringViolation v
            WHERE v.attempt.id = :attemptId
            AND v.createdAt BETWEEN :start AND :end
            ORDER BY v.createdAt
            """)
  List<ProctoringViolation> findByAttemptIdAndTimeRange(
      @Param("attemptId") Long attemptId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  /**
   * Checks if any critical violations exist for an attempt.
   *
   * @param attemptId the attempt ID
   * @return true if critical violations exist
   */
  @Query(
      "SELECT COUNT(v) > 0 FROM ProctoringViolation v WHERE v.attempt.id = :attemptId AND"
          + " v.severity = 'CRITICAL'")
  boolean hasCriticalViolations(@Param("attemptId") Long attemptId);

  /**
   * Gets aggregate violation stats for a test (for teacher analytics).
   *
   * @param testId the test ID
   * @return list of [attemptId, totalViolations, criticalCount] arrays
   */
  @Query(
      """
            SELECT v.attempt.id, COUNT(v),
                   SUM(CASE WHEN v.severity = 'CRITICAL' THEN 1 ELSE 0 END)
            FROM ProctoringViolation v
            WHERE v.attempt.test.id = :testId
            GROUP BY v.attempt.id
            """)
  List<Object[]> getViolationStatsForTest(@Param("testId") Long testId);

  /**
   * Deletes all violations for an attempt.
   *
   * @param attemptId the attempt ID
   */
  void deleteAllByAttemptId(Long attemptId);
}
