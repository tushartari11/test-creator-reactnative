-- Rollback: DROP TABLE options CASCADE;

CREATE TABLE options (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL,
    option_number INTEGER NOT NULL CHECK (option_number >= 1 AND option_number <= 4),
    option_text TEXT NOT NULL,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT uq_question_option_number UNIQUE (question_id, option_number)
);

-- Indexes for performance
CREATE INDEX idx_options_question ON options(question_id);
CREATE INDEX idx_options_question_number ON options(question_id, option_number);

-- Comments
COMMENT ON TABLE options IS 'Answer options for questions (exactly 4 per question)';
COMMENT ON COLUMN options.option_number IS 'Option number (1-4)';
