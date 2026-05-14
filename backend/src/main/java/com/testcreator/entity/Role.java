package com.testcreator.entity;

/**
 * Enum representing user roles in the system.
 *
 * <p>Roles define the access level and capabilities of users:
 * <ul>
 *   <li>TEACHER - Can create, manage, and publish tests; view results and analytics</li>
 *   <li>STUDENT - Can take published tests and view their results</li>
 * </ul>
 */
public enum Role {
    /**
     * Teacher role with privileges to create and manage tests.
     */
    TEACHER,

    /**
     * Student role with privileges to take tests and view results.
     */
    STUDENT
}
