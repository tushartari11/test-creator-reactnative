package com.testcreator.repository;

import com.testcreator.entity.Role;
import com.testcreator.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for User entity operations.
 *
 * <p>Provides CRUD operations and custom queries for user management, authentication, and
 * authorization.
 *
 * @see User
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

  /**
   * Finds a user by email address.
   *
   * @param email the email address
   * @return Optional containing the user if found
   */
  Optional<User> findByEmail(String email);

  /**
   * Checks if a user exists with the given email.
   *
   * @param email the email address to check
   * @return true if user exists, false otherwise
   */
  boolean existsByEmail(String email);

  /**
   * Finds all active users with a specific role.
   *
   * @param role the user role
   * @return list of users with the specified role
   */
  @Query("SELECT u FROM User u WHERE u.active = true AND u.role = :role")
  List<User> findActiveUsersByRole(@Param("role") Role role);

  /**
   * Finds a user by ID only if active.
   *
   * @param id the user ID
   * @return Optional containing the user if found and active
   */
  @Query("SELECT u FROM User u WHERE u.id = :id AND u.active = true")
  Optional<User> findActiveById(@Param("id") Long id);

  /**
   * Counts users by role.
   *
   * @param role the user role
   * @return count of users with the specified role
   */
  long countByRole(Role role);

  /**
   * Finds users by role and active status.
   *
   * @param role the user role
   * @param active the active status
   * @return list of users matching criteria
   */
  List<User> findByRoleAndActive(Role role, Boolean active);
}
