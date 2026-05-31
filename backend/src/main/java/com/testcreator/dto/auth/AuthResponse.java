package com.testcreator.dto.auth;

import com.testcreator.dto.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for authentication response (login/register). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

  private String token;
  private String tokenType;
  private Long expiresIn;
  private UserDto user;

  /** Factory method to create an AuthResponse. */
  public static AuthResponse of(String token, Long expiresIn, UserDto user) {
    return AuthResponse.builder()
        .token(token)
        .tokenType("Bearer")
        .expiresIn(expiresIn)
        .user(user)
        .build();
  }
}
