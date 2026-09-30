package com.hirehub.config;

import com.hirehub.security.CustomUserDetailsService;
import com.hirehub.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            CustomUserDetailsService userDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> {})

                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Without this, Spring Security answers unauthenticated requests
                // (no token, or an expired/invalid one) with a bare 403. The
                // frontend only treats 401 as "log in again", so expired
                // sessions never redirected to the login page.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"message\":\"Your session has expired or you are not signed in. Please log in again.\"}");
                        })
                        // Signed in, but with the wrong role for this URL (see the role rules below).
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"message\":\"Your account type can't use this feature.\"}");
                        })
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()
                        .requestMatchers("/uploads/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/joboffers/**").permitAll()

                        // Role rules, checked before any request body is read or validated. The
                        // controllers check the role too (CurrentUserProvider.requireRole).
                        .requestMatchers("/api/recruiters/**").hasRole("RECRUITER")
                        .requestMatchers("/api/candidates/**").hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.POST, "/api/applications").hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/status").hasRole("RECRUITER")
                        .requestMatchers("/api/applications/*/evaluation").hasRole("RECRUITER")
                        .requestMatchers("/api/applications/**").authenticated()

                        .anyRequest().authenticated()
                )

                .authenticationProvider(authenticationProvider())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }
}