package com.testcreator.exception;

/**
 * Exception thrown when authentication fails.
 *
 * <p>HTTP Status: 401 UNAUTHORIZED
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}
