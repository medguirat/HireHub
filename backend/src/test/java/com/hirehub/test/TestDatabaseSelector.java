package com.hirehub.test;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.testcontainers.DockerClientFactory;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map;

/**
 * Chooses the backend tests' database, with HIREHUB_TEST_DB:
 * <ul>
 *   <li>{@code testcontainers}: a throwaway MySQL 8.0 in Docker, started once per test run
 *       (Testcontainers). What CI uses: no database to install.</li>
 *   <li>{@code local}: the local MySQL's hirehub_test database (DB_USERNAME / DB_PASSWORD).</li>
 *   <li>{@code auto} (default): Testcontainers when Docker is running, otherwise local.</li>
 * </ul>
 * Either way, each test context empties the database and rebuilds it with the Flyway migrations
 * (TestDatabaseConfig).
 */
public class TestDatabaseSelector implements EnvironmentPostProcessor {

    static final String TESTCONTAINERS_URL = "jdbc:tc:mysql:8.0:///hirehub_test?TC_DAEMON=true";
    private static volatile Boolean dockerAvailable;

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!Arrays.asList(environment.getActiveProfiles()).contains("test")) {
            return;
        }
        String choice = environment.getProperty("HIREHUB_TEST_DB", "auto").trim().toLowerCase(Locale.ROOT);
        boolean useContainer = switch (choice) {
            case "testcontainers" -> true;
            case "local" -> false;
            case "auto" -> dockerAvailable();
            default -> throw new IllegalStateException(
                    "HIREHUB_TEST_DB must be auto, testcontainers or local, not \"" + choice + "\".");
        };
        if (useContainer) {
            environment.getPropertySources().addFirst(new MapPropertySource("hirehubTestDatabase", Map.of(
                    "spring.datasource.url", TESTCONTAINERS_URL,
                    "spring.datasource.username", "test",
                    "spring.datasource.password", "test",
                    "spring.datasource.driver-class-name", "org.testcontainers.jdbc.ContainerDatabaseDriver")));
        }
    }

    private static boolean dockerAvailable() {
        if (dockerAvailable == null) {
            try {
                dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
            } catch (RuntimeException | LinkageError e) {
                dockerAvailable = false;
            }
        }
        return dockerAvailable;
    }
}
