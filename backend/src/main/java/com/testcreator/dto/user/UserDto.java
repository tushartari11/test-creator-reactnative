package com.testcreator.dto.user;

import com.testcreator.entity.Role;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO for user response (never exposes password). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SuppressWarnings("checkstyle:AbbreviationAsWordInNameCheck")
public class UserDto {

  private Long id;
  private String email;
  private String name;
  private Role role;
  private Boolean active;
  private LocalDateTime createdAt;
}
