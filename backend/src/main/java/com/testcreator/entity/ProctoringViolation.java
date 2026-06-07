package com.testcreator.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Entity representing a proctoring violation during a test attempt.
 *
 * <p>Records security violations detected by the frontend proctoring system, such as tab switches,
 * copy attempts, and window blur events.
 *
 * @see TestAttempt
 * @see ViolationType
 * @see ViolationSeverity
 */
@Entity
@Table(
    name = "proctoring_violations",
    indexes = {
      @Index(name = "idx_violation_attempt_id", columnList = "attempt_id"),
      @Index(name = "idx_violation_type", columnList = "violation_type"),
      @Index(name = "idx_violation_severity", columnList = "severity"),
      @Index(name = "idx_violation_created_at", columnList = "created_at DESC")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ProctoringViolation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "attempt_id", nullable = false)
  private TestAttempt attempt;

  @Enumerated(EnumType.STRING)
  @Column(name = "violation_type", nullable = false, length = 50)
  private ViolationType violationType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ViolationSeverity severity;

  @Column(columnDefinition = "TEXT")
  private String message;

  /**
   * Additional details about the violation stored as JSON. Can include browser info, screen
   * dimensions, keyboard keys, etc.
   */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> details;

  /**
   * Timestamp from the client when the violation occurred. May differ from createdAt due to network
   * delay.
   */
  @Column(name = "client_timestamp")
  private LocalDateTime clientTimestamp;

  @CreatedDate
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  /**
   * Creates a violation with default severity based on type.
   *
   * @param attempt the test attempt
   * @param type the violation type
   * @return a new ProctoringViolation with appropriate severity
   */
  public static ProctoringViolation create(TestAttempt attempt, ViolationType type) {
    return ProctoringViolation.builder()
        .attempt(attempt)
        .violationType(type)
        .severity(getDefaultSeverity(type))
        .build();
  }

  /**
   * Returns the default severity for a violation type.
   *
   * @param type the violation type
   * @return the default severity level
   */
  public static ViolationSeverity getDefaultSeverity(ViolationType type) {
    return switch (type) {
      case RIGHT_CLICK, SCREEN_RESIZE -> ViolationSeverity.LOW;
      case TAB_SWITCH, WINDOW_BLUR, BROWSER_NAVIGATION -> ViolationSeverity.MEDIUM;
      case COPY_PASTE, KEYBOARD_SHORTCUT, HEARTBEAT_MISSED, CONNECTION_LOST ->
          ViolationSeverity.HIGH;
      case DEVTOOLS_OPEN, MULTIPLE_MONITORS -> ViolationSeverity.CRITICAL;
      case OTHER -> ViolationSeverity.MEDIUM;
    };
  }
}
