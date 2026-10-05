package com.hirehub.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Signs the request in from its login token: the "Authorization: Bearer" header (API clients) or,
 * without that header, the session cookie (the browser app). A session cookie that can't sign
 * anyone in is deleted.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final SessionCookie sessionCookie;

    public JwtAuthenticationFilter(
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            SessionCookie sessionCookie
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.sessionCookie = sessionCookie;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        boolean fromCookie = authHeader == null;
        String token;
        if (fromCookie) {
            token = SessionCookie.read(request).orElse(null);
        } else {
            token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
        }

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (token.isBlank() || token.split("\\.").length != 3) {
            forgetCookie(fromCookie, response);
            filterChain.doFilter(request, response);
            return;
        }

        try {
            JwtService.TokenClaims claims = jwtService.parse(token);
            String email = claims.email();

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                // Issued before the password was last changed (e.g. reset): this session is over.
                if (userDetails instanceof CustomUserDetailsService.AppUserDetails user
                        && !user.acceptsTokenIssuedAt(claims.issuedAt())) {
                    forgetCookie(fromCookie, response);
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // Expired, malformed or wrongly signed: not signed in. A protected route then answers 401.
            SecurityContextHolder.clearContext();
            forgetCookie(fromCookie, response);
        } catch (UsernameNotFoundException ex) {
            // A valid token for an account deleted since.
            SecurityContextHolder.clearContext();
            forgetCookie(fromCookie, response);
        }

        filterChain.doFilter(request, response);
    }

    private void forgetCookie(boolean fromCookie, HttpServletResponse response) {
        if (fromCookie) {
            response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.clear().toString());
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        return path.startsWith("/api/auth")
                || (path.equals("/api/users") && request.getMethod().equals("POST"))
                || (path.startsWith("/api/joboffers") && request.getMethod().equals("GET"));
    }
}
