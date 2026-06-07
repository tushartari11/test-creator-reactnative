package com.testcreator.entity;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Entity representing a student's attempt at taking a test.
 *
 * <p>Tracks the test-taking session including timing, score, proctoring violations, and individual
 * answers. Each student can have only one attempt per test.
 *
 * @see Test
 * @see User
 * @see StudentAnswer
 * @see AttemptStatus
 * @see ResultStatus
 */
@Entity
@Table(
    name = "test_attempts",
    indexes = {
      @Index(name = "idx_attempt_test", columnList = "test_id"),
      @Index(name = "idx_attempt_student", columnList = "student_id"),
      @Index(name = "idx_attempt_test_student", columnList = "test_id,student_id"),
      @Index(name = "idx_attempt_status", columnList = "status")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class TestAttempt {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "test_id", nullable = false)
  private Test test;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = true)
  private User student;

  // Guest tracking fields
  @Column(length = 100)
  private String guestName;

  @Column(length = 100)
  private String guestToken;

  @Column(nullable = false)
  private LocalDateTime startedAt;

  private LocalDateTime submittedAt;

  @Column(nullable = false)
  @Builder.Default
  private Integer score = 0;

  @Column(nullable = false)
  @Builder.Default
  private Integer correctAnswers = 0;

  @Column(nullable = false)
  @Builder.Default
  private Integer wrongAnswers = 0;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  @Builder.Default
  private AttemptStatus status = AttemptStatus.IN_PROGRESS;

  @Enumerated(EnumType.STRING)
  @Column(length = 50)
  private ResultStatus result;

  // Proctoring fields
  @Column(nullable = false)
  @Builder.Default
  private Integer tabSwitchCount = 0;

  @Column(nullable = false)
  @Builder.Default
  private Boolean monitorCheckPassed = true;

  @Column(length = 500)
  private String browserInfo;

  @Column(length = 50)
  private String ipAddress;

  @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<StudentAnswer> answers = new ArrayList<>();

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // Helper methods for bidirectional relationship
  public void addAnswer(StudentAnswer answer) {
    answers.add(answer);
    answer.setAttempt(this);
  }

  public void removeAnswer(StudentAnswer answer) {
    answers.remove(answer);
    answer.setAttempt(null);
  }

  // Business logic helper methods
  /** Returns true if the attempt has exceeded the allowed duration. */
  public boolean isExpired(Integer durationMinutes) {
    if (startedAt == null || durationMinutes == null) {
      return false;
    }
    LocalDateTime expiryTime = startedAt.plusMinutes(durationMinutes);
    return LocalDateTime.now().isAfter(expiryTime);
  }

  /** Returns the absolute expiry time of the attempt, or null if start time is unknown. */
  public LocalDateTime getExpiryTime(Integer durationMinutes) {
    if (startedAt == null || durationMinutes == null) {
      return null;
    }
    return startedAt.plusMinutes(durationMinutes);
  }
}
