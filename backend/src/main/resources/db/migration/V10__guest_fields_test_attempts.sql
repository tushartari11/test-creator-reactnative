-- Migration: Add guestName and guestToken to test_attempts, make student_id nullable
ALTER TABLE test_attempts
    ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE test_attempts
    ADD COLUMN guest_name VARCHAR(100),
    ADD COLUMN guest_token VARCHAR(100);
