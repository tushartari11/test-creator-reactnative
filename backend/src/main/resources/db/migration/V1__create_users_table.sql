-- Rollback: DROP TABLE users CASCADE;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('TEACHER', 'STUDENT')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active) WHERE active = true;

-- Comments
COMMENT ON TABLE users IS 'Application users (teachers and students)';
COMMENT ON COLUMN users.email IS 'Unique email address for authentication';
COMMENT ON COLUMN users.password IS 'BCrypt hashed password';
COMMENT ON COLUMN users.role IS 'User role: TEACHER or STUDENT';
COMMENT ON COLUMN users.active IS 'Account status - false for deactivated users';
