-- V11: Update option constraints from 4 to 3 options per question
-- This migration changes the system from 4 options to 3 options per question

-- First, delete any existing option 4 entries (they will no longer be valid)
DELETE
FROM options
WHERE option_number = 4;

-- Update any student answers that selected option 4 to option 1 (or handle as needed)
UPDATE student_answers
SET selected_option = 1
WHERE selected_option = 4;

-- Update any questions where correct answer was option 4 to option 1 (or handle as needed)
UPDATE questions
SET correct_option_number = 1
WHERE correct_option_number = 4;

-- Update options table constraint
ALTER TABLE options DROP CONSTRAINT IF EXISTS options_option_number_check;
ALTER TABLE options
    ADD CONSTRAINT options_option_number_check CHECK (option_number >= 1 AND option_number <= 3);

-- Update questions table constraint
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_option_number_check;
ALTER TABLE questions
    ADD CONSTRAINT questions_correct_option_number_check CHECK (correct_option_number >= 1 AND correct_option_number <= 3);

-- Update student_answers table constraint
ALTER TABLE student_answers DROP CONSTRAINT IF EXISTS student_answers_selected_option_check;
ALTER TABLE student_answers
    ADD CONSTRAINT student_answers_selected_option_check CHECK (selected_option >= 1 AND selected_option <= 3);

-- Update comments
COMMENT
ON TABLE options IS 'Answer options for questions (exactly 3 per question)';
COMMENT
ON COLUMN options.option_number IS 'Option number (1-3)';
COMMENT
ON COLUMN questions.correct_option_number IS 'Number of the correct option (1-3)';
COMMENT
ON COLUMN student_answers.selected_option IS 'Option number (1-3) selected by student';
