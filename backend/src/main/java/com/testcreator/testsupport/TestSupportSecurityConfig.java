package com.testcreator.testsupport;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Profile-guarded security filter chain for the /api/test-support/** surface.
 *
 * <p>Loaded only when the {@code e2e} profile is active. Spring Security picks
 * the first matching chain by {@link Order}, so this runs before the main
 * SecurityConfig and bypasses JWT auth for the test-support endpoints.
 *
 * <p>The main SecurityConfig is intentionally untouched.
 */
@Configuration
@EnableWebSecurity
@Profile("e2e")
public class TestSupportSecurityConfig {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    SecurityFilterChain testSupportFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/test-support/**")
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
