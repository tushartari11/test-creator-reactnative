-- Rollback: DROP TABLE student_answers CASCADE;

CREATE TABLE student_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option INTEGER NOT NULL CHECK (selected_option >= 1 AND selected_option <= 4),
    is_correct BOOLEAN NOT NULL DEFAULT false,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- Indexes for performance
CREATE INDEX idx_answer_attempt ON student_answers(attempt_id);
CREATE INDEX idx_answer_question ON student_answers(question_id);
CREATE INDEX idx_answer_attempt_question ON student_answers(attempt_id, question_id);
CREATE INDEX idx_answer_correct ON student_answers(is_correct) WHERE is_correct = true;

-- Comments
COMMENT ON TABLE student_answers IS 'Individual answers submitted by students during test attempts';
COMMENT ON COLUMN student_answers.selected_option IS 'Option number (1-4) selected by student';
COMMENT ON COLUMN student_answers.is_correct IS 'Whether the selected option was correct';
COMMENT ON CONSTRAINT uq_attempt_question ON student_answers IS 'Each question can only be answered once per attempt';
