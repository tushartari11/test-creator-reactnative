-- ============================================================================
-- V8: Create proctoring_violations table
-- ============================================================================
-- Tracks all proctoring violations during test attempts
-- Used for monitoring cheating attempts and test integrity

CREATE TABLE proctoring_violations (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT,
    details JSONB,
    client_timestamp TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_violation_attempt 
        FOREIGN KEY (attempt_id) 
        REFERENCES test_attempts(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_violation_type 
        CHECK (violation_type IN (
            'TAB_SWITCH',
            'WINDOW_BLUR', 
            'COPY_PASTE',
            'RIGHT_CLICK',
            'KEYBOARD_SHORTCUT',
            'SCREEN_RESIZE',
            'DEVTOOLS_OPEN',
            'MULTIPLE_MONITORS',
            'CONNECTION_LOST',
            'HEARTBEAT_MISSED',
            'BROWSER_NAVIGATION',
            'OTHER'
        )),
    
    CONSTRAINT chk_severity
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Indexes for efficient querying
CREATE INDEX idx_violation_attempt_id ON proctoring_violations(attempt_id);
CREATE INDEX idx_violation_type ON proctoring_violations(violation_type);
CREATE INDEX idx_violation_severity ON proctoring_violations(severity);
CREATE INDEX idx_violation_created_at ON proctoring_violations(created_at DESC);

-- Composite index for attempt queries with time ordering
CREATE INDEX idx_violation_attempt_time ON proctoring_violations(attempt_id, created_at DESC);

COMMENT ON TABLE proctoring_violations IS 'Records all proctoring violations during test attempts';
COMMENT ON COLUMN proctoring_violations.violation_type IS 'Type of violation detected';
COMMENT ON COLUMN proctoring_violations.severity IS 'Severity level: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN proctoring_violations.details IS 'JSON with additional violation context';
COMMENT ON COLUMN proctoring_violations.client_timestamp IS 'When the violation occurred on client side';
