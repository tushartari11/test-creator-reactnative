package com.testcreator.repository;

import com.testcreator.entity.GuestTestSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for GuestTestSession entity operations.
 *
 * @see GuestTestSession
 */
@Repository
public interface GuestTestSessionRepository extends JpaRepository<GuestTestSession, Long> {

        /**
         * Finds a guest session by token.
         *
         * @param guestToken the guest token
         * @return Optional containing the guest session if found
         */
        Optional<GuestTestSession> findByGuestToken(String guestToken);

        /**
         * Finds a valid (not expired, not used) guest session by token.
         *
         * @param guestToken the guest token
         * @return Optional containing the guest session if valid
         */
        @Query("SELECT gs FROM GuestTestSession gs " +
                        "WHERE gs.guestToken = :guestToken " +
                        "AND gs.expiresAt > CURRENT_TIMESTAMP " +
                        "AND gs.isUsed = false")
        Optional<GuestTestSession> findValidByGuestToken(@Param("guestToken") String guestToken);

        /**
         * Finds a valid (not expired, not used) guest session by token with eagerly
         * fetched Test entity.
         *
         * @param guestToken the guest token
         * @return Optional containing the guest session if valid
         */
        @EntityGraph(attributePaths = { "test" })
        @Query("SELECT gs FROM GuestTestSession gs WHERE gs.guestToken = :guestToken AND gs.expiresAt > CURRENT_TIMESTAMP AND gs.isUsed = false")
        Optional<GuestTestSession> findValidByGuestTokenWithTest(@Param("guestToken") String guestToken);

        /**
         * Checks if a guest token exists and is valid.
         *
         * @param guestToken the guest token
         * @return true if valid, false otherwise
         */
        @Query("SELECT CASE WHEN COUNT(gs) > 0 THEN true ELSE false END FROM GuestTestSession gs " +
                        "WHERE gs.guestToken = :guestToken " +
                        "AND gs.expiresAt > CURRENT_TIMESTAMP " +
                        "AND gs.isUsed = false")
        boolean isValidToken(@Param("guestToken") String guestToken);
}
