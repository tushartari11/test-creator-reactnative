-- Rollback: DROP TABLE tests CASCADE;

CREATE TABLE tests (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by_id BIGINT NOT NULL,
    total_questions INTEGER NOT NULL CHECK (total_questions > 0 AND total_questions <= 100),
    passing_score INTEGER NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 240),
    test_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_tests_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_tests_created_by ON tests(created_by_id);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_date ON tests(test_date);
CREATE INDEX idx_tests_created_by_status ON tests(created_by_id, status);

-- Partial index for active tests only (performance optimization)
CREATE INDEX idx_active_tests ON tests(status) WHERE status = 'PUBLISHED';

-- Comments
COMMENT ON TABLE tests IS 'Tests/examinations created by teachers';
COMMENT ON COLUMN tests.status IS 'Test lifecycle status: DRAFT, PUBLISHED, or ARCHIVED';
COMMENT ON COLUMN tests.duration_minutes IS 'Time limit in minutes for completing the test';
COMMENT ON COLUMN tests.passing_score IS 'Minimum percentage score required to pass';
