package com.hirehub.config;

import com.hirehub.exception.ApiError;
import com.hirehub.exception.ApiErrorWriter;
import com.hirehub.exception.ErrorCodes;
import com.hirehub.security.CustomUserDetailsService;
import com.hirehub.security.JwtAuthenticationFilter;
import com.hirehub.security.SessionCookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
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

import com.hirehub.security.SpaCsrfTokenRequestHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfException;

import java.util.Set;
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

                // CSRF: a request that carries the session cookie (sent by the browser on its own)
                // and changes something must also send the token from the XSRF-TOKEN cookie in the
                // X-XSRF-TOKEN header, which another site can't read. Requests without the session
                // cookie, or with an Authorization header (which another site can't add), carry no
                // ambient credentials and are not checked. Login and signup only accept JSON, which
                // another site can't send without a CORS preflight this API refuses.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfCookie())
                        .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                        .requireCsrfProtectionMatcher(SecurityConfig::needsCsrfToken))

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
                        // A missing or wrong CSRF token, or signed in with the wrong role for this URL.
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                errorWriter.write(response, HttpServletResponse.SC_FORBIDDEN,
                                        accessDeniedException instanceof CsrfException
                                                ? ApiError.of(ErrorCodes.CSRF_INVALID,
                                                        "This page's security check has expired. Please reload the page and try again.")
                                                : ApiError.of(ErrorCodes.FORBIDDEN, "Your account type can't use this feature.")))
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

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    /** XSRF-TOKEN, readable by the app's JavaScript (that's the point), only sent to this site. */
    private static CookieCsrfTokenRepository csrfCookie() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie.sameSite("Strict"));
        return repository;
    }

    static boolean needsCsrfToken(HttpServletRequest request) {
        return !SAFE_METHODS.contains(request.getMethod())
                && request.getHeader(HttpHeaders.AUTHORIZATION) == null
                && SessionCookie.read(request).isPresent();
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