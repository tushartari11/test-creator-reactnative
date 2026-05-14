package com.testcreator.entity;

/**
 * Enum representing the status of a test attempt.
 *
 * <p>Attempt states during test-taking:
 * <ul>
 *   <li>IN_PROGRESS - Student is currently taking the test</li>
 *   <li>SUBMITTED - Test has been submitted for grading</li>
 *   <li>EXPIRED - Time limit exceeded before submission</li>
 *   <li>ABANDONED - Student left the test incomplete (e.g., closed browser)</li>
 * </ul>
 */
public enum AttemptStatus {
    /**
     * Test attempt is in progress - student is actively taking the test.
     */
    IN_PROGRESS,

    /**
     * Test has been submitted by the student.
     * Ready for grading or already graded.
     */
    SUBMITTED,

    /**
     * Test attempt expired - time limit reached before submission.
     * Automatically submitted with answered questions only.
     */
    EXPIRED,

    /**
     * Test attempt was abandoned by the student.
     * Student navigated away or closed browser without submitting.
     */
    ABANDONED
}
