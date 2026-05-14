CREATE TABLE guest_sessions (
    id BIGSERIAL PRIMARY KEY,
    guest_token VARCHAR(100) NOT NULL UNIQUE,
    test_id BIGINT NOT NULL,
    guest_email VARCHAR(100),
    guest_phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

CREATE INDEX idx_guest_token ON guest_sessions(guest_token);
CREATE INDEX idx_guest_test ON guest_sessions(test_id);
CREATE INDEX idx_guest_created ON guest_sessions(created_at);
