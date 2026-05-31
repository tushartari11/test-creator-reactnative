package com.testcreator.security;

import com.testcreator.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Utility class for security-related operations.
 *
 * <p>Provides methods to extract current user information from Spring Security context.
 */
@Component
@Slf4j
public class SecurityUtil {

  /**
   * Retrieves the email of the currently authenticated user.
   *
   * @return email of current user
   * @throws UnauthorizedException if user is not authenticated
   */
  public String getCurrentUserEmail() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      throw new UnauthorizedException("User is not authenticated");
    }

    Object principal = authentication.getPrincipal();

    if (principal instanceof UserDetails) {
      return ((UserDetails) principal).getUsername();
    } else if (principal instanceof String) {
      return (String) principal;
    }

    throw new UnauthorizedException("Unable to extract user email from authentication");
  }

  /**
   * Retrieves the username of the currently authenticated user.
   *
   * <p>Same as getCurrentUserEmail() but named differently for clarity.
   *
   * @return username of current user
   * @throws UnauthorizedException if user is not authenticated
   */
  public String getCurrentUsername() {
    return getCurrentUserEmail();
  }

  /**
   * Checks if user is authenticated.
   *
   * @return true if user is authenticated, false otherwise
   */
  public boolean isAuthenticated() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication != null && authentication.isAuthenticated();
  }

  /**
   * Checks if current user has a specific role.
   *
   * @param role role name to check
   * @return true if user has the role, false otherwise
   */
  public boolean hasRole(String role) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication != null
        && authentication.getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_" + role));
  }
}
