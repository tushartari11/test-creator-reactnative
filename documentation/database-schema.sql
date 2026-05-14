-- Online Test Creator - Database Schema
-- PostgreSQL 15+

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('TEACHER', 'STUDENT', 'ADMIN')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);

-- ============================================================================
-- TEST MANAGEMENT
-- ============================================================================

CREATE TABLE tests (
    id BIGSERIAL PRIMARY KEY,
    created_by_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    total_questions INTEGER NOT NULL,
    passing_score INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    test_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tests_created_by ON tests(created_by_id);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_test_date ON tests(test_date);
CREATE INDEX idx_tests_created_by_status ON tests(created_by_id, status);
CREATE INDEX idx_active_tests ON tests(status) WHERE status = 'PUBLISHED';

-- ============================================================================
-- QUESTIONS AND OPTIONS
-- ============================================================================

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT,
    correct_option_number INTEGER NOT NULL CHECK (correct_option_number BETWEEN 1 AND 4),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    UNIQUE(test_id, question_number)
);

CREATE INDEX idx_questions_test_id ON questions(test_id);

CREATE TABLE options (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL,
    option_number INTEGER NOT NULL CHECK (option_number BETWEEN 1 AND 4),
    option_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(question_id, option_number)
);

CREATE INDEX idx_options_question_id ON options(question_id);

-- ============================================================================
-- TEST ATTEMPTS AND RESULTS
-- ============================================================================

CREATE TABLE test_attempts (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EVALUATED')),
    result VARCHAR(50) CHECK (result IN ('PASS', 'FAIL')),
    
    -- Proctoring fields
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    monitor_check_passed BOOLEAN NOT NULL DEFAULT TRUE,
    browser_info VARCHAR(500),
    ip_address VARCHAR(50),
    last_heartbeat TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(test_id, student_id)
);

CREATE INDEX idx_attempts_test_id ON test_attempts(test_id);
CREATE INDEX idx_attempts_student_id ON test_attempts(student_id);
CREATE INDEX idx_attempts_test_student ON test_attempts(test_id, student_id);
CREATE INDEX idx_attempts_status ON test_attempts(status);
CREATE INDEX idx_attempts_student_submitted ON test_attempts(student_id, submitted_at DESC);

CREATE TABLE student_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option INTEGER NOT NULL CHECK (selected_option BETWEEN 1 AND 4),
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_student_answers_attempt ON student_answers(attempt_id);
CREATE INDEX idx_student_answers_question ON student_answers(question_id);

-- ============================================================================
-- QUESTION BANK
-- ============================================================================

CREATE TABLE question_bank (
    id BIGSERIAL PRIMARY KEY,
    created_by_id BIGINT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    question_text TEXT NOT NULL,
    explanation TEXT,
    correct_option_number INTEGER NOT NULL CHECK (correct_option_number BETWEEN 1 AND 4),
    usage_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[], -- PostgreSQL array for tags
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_qbank_created_by ON question_bank(created_by_id);
CREATE INDEX idx_qbank_subject ON question_bank(subject);
CREATE INDEX idx_qbank_topic ON question_bank(topic);
CREATE INDEX idx_qbank_difficulty ON question_bank(difficulty);
CREATE INDEX idx_qbank_tags ON question_bank USING GIN(tags);

CREATE TABLE question_bank_options (
    id BIGSERIAL PRIMARY KEY,
    bank_item_id BIGINT NOT NULL,
    option_number INTEGER NOT NULL CHECK (option_number BETWEEN 1 AND 4),
    option_text TEXT NOT NULL,
    
    FOREIGN KEY (bank_item_id) REFERENCES question_bank(id) ON DELETE CASCADE,
    UNIQUE(bank_item_id, option_number)
);

CREATE INDEX idx_qbank_options_item ON question_bank_options(bank_item_id);

-- ============================================================================
-- PROCTORING VIOLATIONS
-- ============================================================================

CREATE TABLE proctoring_violations (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    violation_message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
);

CREATE INDEX idx_violations_attempt ON proctoring_violations(attempt_id);
CREATE INDEX idx_violations_timestamp ON proctoring_violations(timestamp DESC);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    details JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for test results summary
CREATE VIEW v_test_results AS
SELECT 
    ta.id AS attempt_id,
    t.id AS test_id,
    t.title AS test_title,
    t.test_date,
    u.id AS student_id,
    u.name AS student_name,
    u.email AS student_email,
    ta.score,
    ta.correct_answers,
    ta.wrong_answers,
    ta.result AS status,
    ta.submitted_at,
    ta.tab_switch_count,
    ta.monitor_check_passed
FROM test_attempts ta
JOIN tests t ON ta.test_id = t.id
JOIN users u ON ta.student_id = u.id
WHERE ta.status = 'EVALUATED';

-- View for test analytics
CREATE VIEW v_test_analytics AS
SELECT 
    t.id AS test_id,
    t.title AS test_title,
    COUNT(ta.id) AS total_attempts,
    AVG(ta.score) AS average_score,
    MIN(ta.score) AS min_score,
    MAX(ta.score) AS max_score,
    COUNT(CASE WHEN ta.result = 'PASS' THEN 1 END) AS pass_count,
    COUNT(CASE WHEN ta.result = 'FAIL' THEN 1 END) AS fail_count,
    ROUND(COUNT(CASE WHEN ta.result = 'PASS' THEN 1 END) * 100.0 / COUNT(ta.id), 2) AS pass_percentage
FROM tests t
LEFT JOIN test_attempts ta ON t.id = ta.test_id AND ta.status = 'EVALUATED'
GROUP BY t.id, t.title;

-- ============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================================================

-- Insert sample users
INSERT INTO users (email, password, name, role) VALUES
-- Password: password123 (BCrypt hash)
('teacher@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjWl8hJzE2e', 'John Teacher', 'TEACHER'),
('student1@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjWl8hJzE2e', 'Alice Student', 'STUDENT'),
('student2@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjWl8hJzE2e', 'Bob Student', 'STUDENT'),
('admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjWl8hJzE2e', 'Admin User', 'ADMIN');

-- Insert sample test
INSERT INTO tests (created_by_id, title, description, total_questions, passing_score, duration_minutes, test_date, status)
VALUES (1, 'Java Fundamentals Quiz', 'Test your knowledge of Java basics', 10, 70, 30, CURRENT_TIMESTAMP + INTERVAL '1 day', 'PUBLISHED');

-- Insert sample questions
INSERT INTO questions (test_id, question_number, question_text, explanation, correct_option_number) VALUES
(1, 1, 'What is Java?', 'Java is a high-level, object-oriented programming language.', 1),
(1, 2, 'What is JVM?', 'JVM stands for Java Virtual Machine.', 2),
(1, 3, 'What is the main method signature in Java?', 'The main method is the entry point of a Java program.', 1),
(1, 4, 'What is inheritance?', 'Inheritance allows a class to inherit properties from another class.', 3),
(1, 5, 'What is polymorphism?', 'Polymorphism allows objects to take multiple forms.', 2);

-- Insert sample options
INSERT INTO options (question_id, option_number, option_text) VALUES
(1, 1, 'A programming language'),
(1, 2, 'A coffee brand'),
(1, 3, 'An island'),
(1, 4, 'A type of bean'),

(2, 1, 'Java Virtual Monitor'),
(2, 2, 'Java Virtual Machine'),
(2, 3, 'Java Variable Method'),
(2, 4, 'Java Version Manager'),

(3, 1, 'public static void main(String[] args)'),
(3, 2, 'private void main()'),
(3, 3, 'public void main(String args)'),
(3, 4, 'static main(String[] args)'),

(4, 1, 'Code reusability'),
(4, 2, 'Data hiding'),
(4, 3, 'Both A and B'),
(4, 4, 'None of the above'),

(5, 1, 'Method overloading'),
(5, 2, 'All of the above'),
(5, 3, 'Method overriding'),
(5, 4, 'Operator overloading');

-- ============================================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ============================================================================

-- Analyze tables for query planner
ANALYZE users;
ANALYZE tests;
ANALYZE questions;
ANALYZE options;
ANALYZE test_attempts;
ANALYZE student_answers;

-- Vacuum tables to reclaim storage
VACUUM ANALYZE users;
VACUUM ANALYZE tests;
VACUUM ANALYZE questions;
VACUUM ANALYZE test_attempts;

-- ============================================================================
-- DATABASE MAINTENANCE
-- ============================================================================

-- Enable auto-vacuum
ALTER TABLE users SET (autovacuum_enabled = true);
ALTER TABLE tests SET (autovacuum_enabled = true);
ALTER TABLE questions SET (autovacuum_enabled = true);
ALTER TABLE test_attempts SET (autovacuum_enabled = true);

-- Set statistics target for better query planning
ALTER TABLE test_attempts ALTER COLUMN test_id SET STATISTICS 1000;
ALTER TABLE test_attempts ALTER COLUMN student_id SET STATISTICS 1000;
ALTER TABLE student_answers ALTER COLUMN attempt_id SET STATISTICS 1000;

-- ============================================================================
-- PARTITIONING (For future scaling)
-- ============================================================================

-- Example: Partition test_attempts by date range
-- CREATE TABLE test_attempts_2026_q1 PARTITION OF test_attempts
--     FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
-- CREATE TABLE test_attempts_2026_q2 PARTITION OF test_attempts
--     FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
