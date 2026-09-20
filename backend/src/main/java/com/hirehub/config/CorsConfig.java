package com.hirehub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    // CHANGED: origin(s) now come from an env var / application property instead
    // of being hardcoded, so this works both in local dev and inside Docker.
    // Example: APP_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    @Value("${app.cors.origins:http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(
                Arrays.asList(allowedOrigins.split(","))
        );

        // FIX: "PATCH" was missing here. Accept/Reject on applications uses
        // @PatchMapping, so the browser's CORS preflight (OPTIONS) rejected it
        // before the request ever reached the controller.
        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        config.setAllowedHeaders(
                List.of("*")
        );

        config.setAllowCredentials(true);


        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
