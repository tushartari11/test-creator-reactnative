package com.testcreator.testsupport;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Belt-and-braces safety check. Even if the e2e profile is accidentally
 * activated in production, this bean refuses to start unless:
 *   1. app.test-support.enabled = true
 *   2. The datasource URL ends in the configured suffix (default "_e2e")
 *
 * Combined with @Profile("e2e"), this gives three independent guards.
 */
@Component
@Profile("e2e")
@RequiredArgsConstructor
@Slf4j
public class TestSupportStartupGuard {

    private final TestSupportProperties props;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @PostConstruct
    void verifySafeToActivate() {
        if (!props.isEnabled()) {
            throw new IllegalStateException(
                "e2e profile is active but app.test-support.enabled=false. Refusing to start.");
        }

        String suffix = props.getAllowedDbUrlSuffix();
        if (suffix == null || suffix.isBlank()) {
            throw new IllegalStateException(
                "app.test-support.allowed-db-url-suffix must be configured.");
        }

        String dbName = extractDbName(datasourceUrl);
        if (dbName == null || !dbName.endsWith(suffix)) {
            throw new IllegalStateException(
                "Datasource URL does not match the e2e safety pattern. Expected DB name to end with '"
                    + suffix + "', got DB name='" + dbName + "'. Refusing to start.");
        }

        log.warn("⚠️  Test-support module is ACTIVE. DB={}. Never activate the 'e2e' profile in production.", dbName);
    }

    /** Extracts the database name from a JDBC URL like jdbc:postgresql://host:port/dbname?params. */
    static String extractDbName(String url) {
        if (url == null) return null;
        int slash = url.lastIndexOf('/');
        if (slash < 0 || slash == url.length() - 1) return null;
        String tail = url.substring(slash + 1);
        int qmark = tail.indexOf('?');
        return qmark < 0 ? tail : tail.substring(0, qmark);
    }
}
