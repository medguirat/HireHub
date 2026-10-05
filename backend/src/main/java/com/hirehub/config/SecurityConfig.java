package com.hirehub.config;

import com.hirehub.exception.ApiError;
import com.hirehub.exception.ApiErrorWriter;
import com.hirehub.exception.ErrorCodes;
import com.hirehub.security.CustomUserDetailsService;
import com.hirehub.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.IpAddressAuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.stream.Stream;


@Configuration
public class SecurityConfig {

    /** Loopback and private (RFC 1918) addresses: this machine, or the Docker network. */
    @SuppressWarnings("unchecked")
    private static final AuthorizationManager<RequestAuthorizationContext> PRIVATE_NETWORK = AuthorizationManagers.anyOf(
            Stream.of("127.0.0.1/32", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
                    .map(IpAddressAuthorizationManager::hasIpAddress)
                    .toArray(AuthorizationManager[]::new));

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ApiErrorWriter errorWriter;

    public SecurityConfig(
            CustomUserDetailsService userDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            ApiErrorWriter errorWriter
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.errorWriter = errorWriter;
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
                        .authenticationEntryPoint((request, response, authException) ->
                                errorWriter.write(response, HttpServletResponse.SC_UNAUTHORIZED, ApiError.of(ErrorCodes.AUTH_REQUIRED,
                                        "Your session has expired or you are not signed in. Please log in again.")))
                        // Signed in, but with the wrong role for this URL (see the role rules below).
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                errorWriter.write(response, HttpServletResponse.SC_FORBIDDEN, ApiError.of(ErrorCodes.FORBIDDEN,
                                        "Your account type can't use this feature.")))
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        // Operations: health and info for anyone (load balancers, Docker); metrics only from
                        // this machine or a private network, never through the public proxy.
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").access(PRIVATE_NETWORK)
                        // API documentation (turned off in production unless API_DOCS_ENABLED=true).
                        .requestMatchers("/v3/api-docs", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        // Error dispatches carry the original response status; they must not be re-secured.
                        .requestMatchers("/error").permitAll()

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