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

/**
 * Entity representing an answer option for a question.
 *
 * <p>Each question has exactly 3 options numbered 1-3.
 * One option is marked as correct via Question.correctOptionNumber.
 *
 * @see Question
 */
@Entity
@Table(name = "options",
       indexes = {
           @Index(name = "idx_options_question", columnList = "question_id"),
           @Index(name = "idx_options_question_number", columnList = "question_id,option_number")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Option {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private Integer optionNumber;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionText;
}
