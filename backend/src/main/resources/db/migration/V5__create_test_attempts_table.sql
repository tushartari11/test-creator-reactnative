-- Rollback: DROP TABLE test_attempts CASCADE;

CREATE TABLE test_attempts (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'ABANDONED')),
    result VARCHAR(50) CHECK (result IN ('PASS', 'FAIL', 'PENDING')),
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    monitor_check_passed BOOLEAN NOT NULL DEFAULT true,
    browser_info VARCHAR(500),
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempts_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_test_student UNIQUE (test_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_attempt_test ON test_attempts(test_id);
CREATE INDEX idx_attempt_student ON test_attempts(student_id);
CREATE INDEX idx_attempt_test_student ON test_attempts(test_id, student_id);
CREATE INDEX idx_attempt_status ON test_attempts(status);
CREATE INDEX idx_attempt_result ON test_attempts(result) WHERE result IS NOT NULL;

-- Comments
COMMENT ON TABLE test_attempts IS 'Student attempts at taking tests';
COMMENT ON COLUMN test_attempts.status IS 'Attempt status: IN_PROGRESS, SUBMITTED, EXPIRED, or ABANDONED';
COMMENT ON COLUMN test_attempts.result IS 'Test result: PASS, FAIL, or PENDING';
COMMENT ON COLUMN test_attempts.tab_switch_count IS 'Number of times student switched tabs (proctoring)';
COMMENT ON COLUMN test_attempts.monitor_check_passed IS 'Whether single monitor check passed (proctoring)';
COMMENT ON CONSTRAINT uq_test_student ON test_attempts IS 'Each student can only attempt a test once';
