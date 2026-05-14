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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entity representing a test/examination.
 *
 * <p>Tests are created by teachers and contain multiple-choice questions.
 * Each test has a defined duration, passing score, and scheduled date.
 *
 * @see Question
 * @see TestStatus
 */
@Entity
@Table(name = "tests",
       indexes = {
           @Index(name = "idx_tests_created_by", columnList = "created_by_id"),
           @Index(name = "idx_tests_status", columnList = "status"),
           @Index(name = "idx_tests_date", columnList = "test_date"),
           @Index(name = "idx_tests_created_by_status", columnList = "created_by_id,status")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Test {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private Integer totalQuestions;

    @Column(nullable = false)
    private Integer passingScore;

    @Column(nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private LocalDateTime testDate;

    @Column(unique = true, length = 20)
    private String accessCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private TestStatus status = TestStatus.DRAFT;

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionNumber ASC")
    @Builder.Default
    private Set<Question> questions = new HashSet<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Helper methods for bidirectional relationship
    public void addQuestion(Question question) {
        questions.add(question);
        question.setTest(this);
    }

    public void removeQuestion(Question question) {
        questions.remove(question);
        question.setTest(null);
    }
}
