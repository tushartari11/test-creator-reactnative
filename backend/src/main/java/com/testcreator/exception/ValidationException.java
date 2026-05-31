package com.testcreator.exception;

/**
 * Exception thrown when business validation fails.
 *
 * <p>HTTP Status: 400 BAD REQUEST
 */
public class ValidationException extends RuntimeException {

  public ValidationException(String message) {
    super(message);
  }

  public ValidationException(String message, Throwable cause) {
    super(message, cause);
  }
}
