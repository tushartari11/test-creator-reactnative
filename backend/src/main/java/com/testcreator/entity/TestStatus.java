package com.testcreator.entity;

/**
 * Enum representing the status of a test.
 *
 * <p>Test lifecycle states:
 *
 * <ul>
 *   <li>DRAFT - Test is being created/edited, not visible to students
 *   <li>PUBLISHED - Test is live and available for students to attempt
 *   <li>ARCHIVED - Test is no longer active, moved to archive for historical purposes
 * </ul>
 */
public enum TestStatus {
  /** Test is in draft mode - being created or edited. Only the creator can see and modify it. */
  DRAFT,

  /** Test has been published and is available for students. Cannot be edited once published. */
  PUBLISHED,

  /**
   * Test has been archived and is no longer accessible to students. Kept for historical/reporting
   * purposes.
   */
  ARCHIVED
}
