package com.testcreator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for Online Test Creator.
 *
 * <p>
 * High-performance online examination platform with advanced proctoring
 * features.
 * Designed to handle 100K-1M queries per second (QPS).
 *
 * @author Test Creator Team
 * @version 0.0.1-SNAPSHOT
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableScheduling
public class TestCreatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestCreatorApplication.class, args);
    }
}
