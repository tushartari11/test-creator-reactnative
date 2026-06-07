package com.testcreator.exception;

/**
 * Exception thrown when attempting to register with an existing email.
 *
 * <p>HTTP Status: 409 CONFLICT
 */
public class DuplicateEmailException extends RuntimeException {

  public DuplicateEmailException(String email) {
    super("Email already registered: " + email);
  }
}
