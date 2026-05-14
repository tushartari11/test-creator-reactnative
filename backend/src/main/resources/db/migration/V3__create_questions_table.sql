-- Rollback: DROP TABLE questions CASCADE;

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT,
    correct_option_number INTEGER NOT NULL CHECK (correct_option_number >= 1 AND correct_option_number <= 4),
    CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT uq_test_question_number UNIQUE (test_id, question_number)
);

-- Indexes for performance
CREATE INDEX idx_questions_test ON questions(test_id);
CREATE INDEX idx_questions_test_number ON questions(test_id, question_number);

-- Comments
COMMENT ON TABLE questions IS 'Questions belonging to tests';
COMMENT ON COLUMN questions.question_number IS 'Order of question within the test (1-based)';
COMMENT ON COLUMN questions.correct_option_number IS 'Number of the correct option (1-4)';
COMMENT ON COLUMN questions.explanation IS 'Explanation shown after test submission';
