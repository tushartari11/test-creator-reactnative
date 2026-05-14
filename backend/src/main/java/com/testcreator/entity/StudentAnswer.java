package com.testcreator.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entity representing a student's answer to a specific question in a test attempt.
 *
 * <p>Records which option the student selected and whether it was correct.
 * Timestamps track when the answer was submitted.
 *
 * @see TestAttempt
 * @see Question
 */
@Entity
@Table(name = "student_answers",
       indexes = {
           @Index(name = "idx_answer_attempt", columnList = "attempt_id"),
           @Index(name = "idx_answer_question", columnList = "question_id"),
           @Index(name = "idx_answer_attempt_question", columnList = "attempt_id,question_id")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private TestAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private Integer selectedOption;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isCorrect = false;

    @Column(nullable = false)
    private LocalDateTime answeredAt;
}
