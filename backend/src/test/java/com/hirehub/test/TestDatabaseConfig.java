package com.hirehub.test;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Each test context starts from an empty database built by the real migrations (clean, then
 * migrate), so the tests always run against the schema production gets.
 */
@Configuration
@Profile("test")
public class TestDatabaseConfig {

    @Bean
    public FlywayMigrationStrategy cleanThenMigrate() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
        };
    }
}
