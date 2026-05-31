package com.testcreator.entity;

/**
 * Enum representing the result of a test attempt.
 *
 * <p>Result determination based on score vs passing score:
 *
 * <ul>
 *   <li>PASS - Student scored >= passing score
 *   <li>FAIL - Student scored < passing score
 *   <li>PENDING - Result not yet calculated (for expired/abandoned attempts)
 * </ul>
 */
public enum ResultStatus {
  /** Student passed the test - score is equal to or above passing score. */
  PASS,

  /** Student failed the test - score is below passing score. */
  FAIL,

  /** Result is pending - test not yet fully graded or attempt incomplete. */
  PENDING
}
