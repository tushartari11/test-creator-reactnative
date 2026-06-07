package com.testcreator.entity;

/**
 * Severity levels for proctoring violations.
 *
 * <p>Severity determines how the system responds to violations: - LOW: Logged only, no action -
 * MEDIUM: Warning shown to student - HIGH: Warning + counted toward threshold - CRITICAL: Test may
 * be auto-submitted
 *
 * @see ProctoringViolation
 * @see ViolationType
 */
public enum ViolationSeverity {

  /**
   * Minor violation, logged but no action taken. Example: Brief window blur, single accidental
   * right-click.
   */
  LOW,

  /** Moderate violation, warning shown to student. Example: Tab switch, copy attempt. */
  MEDIUM,

  /**
   * Serious violation, counts toward auto-submit threshold. Example: Multiple tab switches,
   * devtools detection.
   */
  HIGH,

  /**
   * Critical violation, may trigger immediate action. Example: Screen sharing detected, multiple
   * monitors.
   */
  CRITICAL
}
