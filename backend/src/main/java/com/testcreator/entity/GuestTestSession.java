package com.testcreator.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entity for tracking guest/anonymous test sessions.
 *
 * <p>Allows unauthenticated access to tests via unique tokens.
 */
@Entity
@Table(
    name = "guest_sessions",
    indexes = {
      @Index(name = "idx_guest_token", columnList = "guest_token", unique = true),
      @Index(name = "idx_guest_test", columnList = "test_id"),
      @Index(name = "idx_guest_created", columnList = "created_at")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuestTestSession {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 100)
  private String guestToken;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "test_id", nullable = false)
  private Test test;

  @Column(length = 100)
  private String guestEmail;

  @Column(length = 20)
  private String guestPhone;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime expiresAt;

  @Column(nullable = false)
  private Boolean isUsed = false;

  @Column private LocalDateTime usedAt;

  public boolean isExpired() {
    return LocalDateTime.now().isAfter(expiresAt);
  }

  public boolean isValid() {
    return !isExpired() && !isUsed;
  }
}
