package com.testcreator.exception;

/**
 * Exception thrown when user lacks permission to access a resource.
 *
 * <p>HTTP Status: 403 FORBIDDEN
 */
public class ForbiddenException extends RuntimeException {

  public ForbiddenException(String message) {
    super(message);
  }

  public ForbiddenException(String message, Throwable cause) {
    super(message, cause);
  }
}
