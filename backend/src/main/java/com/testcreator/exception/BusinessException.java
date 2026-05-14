package com.testcreator.exception;

/**
 * Exception thrown when a business rule is violated.
 *
 * <p>HTTP Status: 409 CONFLICT
 *
 * <p>Examples:
 * <ul>
 *   <li>Cannot delete test with existing attempts</li>
 *   <li>Cannot update published test</li>
 *   <li>Student already attempted this test</li>
 * </ul>
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
