package com.testcreator.service;

import com.testcreator.dto.auth.AuthResponse;
import com.testcreator.dto.auth.LoginRequest;
import com.testcreator.dto.auth.RegisterRequest;
import com.testcreator.dto.user.UserDTO;
import com.testcreator.entity.User;
import com.testcreator.exception.DuplicateEmailException;
import com.testcreator.exception.ValidationException;
import com.testcreator.repository.UserRepository;
import com.testcreator.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for handling authentication operations.
 *
 * <p>Manages user registration, login, and JWT token generation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtil jwtUtil;
  private final AuthenticationManager authenticationManager;

  @Value("${jwt.expiration}")
  private Long jwtExpiration;

  /**
   * Registers a new user.
   *
   * @param request registration request
   * @return authentication response with JWT token
   * @throws DuplicateEmailException if email already exists
   * @throws ValidationException if password is weak
   */
  @Transactional
  public AuthResponse register(RegisterRequest request) {
    log.info("Registering new user: {}", request.getEmail());

    // Check if email already exists
    if (userRepository.existsByEmail(request.getEmail())) {
      throw new DuplicateEmailException(request.getEmail());
    }

    // Validate password strength
    validatePasswordStrength(request.getPassword());

    // Create user
    User user =
        User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .name(request.getName())
            .role(request.getRole())
            .active(true)
            .build();

    user = userRepository.save(user);

    // Generate token
    UserDetails userDetails =
        org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPassword())
            .authorities("ROLE_" + user.getRole().name())
            .build();

    String token = jwtUtil.generateToken(userDetails);

    log.info("User registered successfully: {}", user.getEmail());

    return AuthResponse.of(token, jwtExpiration, mapToUserDto(user));
  }

  /**
   * Authenticates a user and generates JWT token.
   *
   * @param request login request
   * @return authentication response with JWT token
   */
  @Transactional(readOnly = true)
  public AuthResponse login(LoginRequest request) {
    log.info("User login attempt: {}", request.getEmail());

    // Authenticate user
    Authentication authentication =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

    // Get user details
    User user =
        userRepository
            .findByEmail(request.getEmail())
            .orElseThrow(() -> new ValidationException("User not found"));

    // Generate token
    UserDetails userDetails = (UserDetails) authentication.getPrincipal();
    String token = jwtUtil.generateToken(userDetails);

    log.info("User logged in successfully: {}", user.getEmail());

    return AuthResponse.of(token, jwtExpiration, mapToUserDto(user));
  }

  /**
   * Gets current authenticated user information.
   *
   * @param email user email
   * @return user DTO
   */
  @Transactional(readOnly = true)
  public UserDTO getCurrentUser(String email) {
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new ValidationException("User not found"));

    return mapToUserDto(user);
  }

  /**
   * Validates password strength.
   *
   * @param password password to validate
   * @throws ValidationException if password is weak
   */
  private void validatePasswordStrength(String password) {
    if (password.length() < 8) {
      throw new ValidationException("Password must be at least 8 characters long");
    }

    boolean hasUpperCase = password.chars().anyMatch(Character::isUpperCase);
    boolean hasLowerCase = password.chars().anyMatch(Character::isLowerCase);
    boolean hasDigit = password.chars().anyMatch(Character::isDigit);

    if (!hasUpperCase || !hasLowerCase || !hasDigit) {
      throw new ValidationException(
          "Password must contain at least one uppercase letter, one lowercase letter, and one"
              + " digit");
    }
  }

  /**
   * Maps User entity to UserDTO.
   *
   * @param user the user entity
   * @return user DTO
   */
  private UserDto mapToUserDto(User user) {
    return UserDto.builder()
        .id(user.getId())
        .email(user.getEmail())
        .name(user.getName())
        .role(user.getRole())
        .active(user.getActive())
        .createdAt(user.getCreatedAt())
        .build();
  }
}
