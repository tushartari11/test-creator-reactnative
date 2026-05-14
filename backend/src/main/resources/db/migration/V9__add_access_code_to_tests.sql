-- Add access_code column to tests table for guest access
ALTER TABLE tests ADD COLUMN access_code VARCHAR(20) UNIQUE;

CREATE INDEX idx_tests_access_code ON tests(access_code) WHERE access_code IS NOT NULL;
