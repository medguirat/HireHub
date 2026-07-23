package com.hirehub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import jdk.jfr.Category;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {


    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;


    public JwtAuthenticationFilter(
            CustomUserDetailsService userDetailsService,
            JwtService jwtService
    ){
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {


        String authHeader =
                request.getHeader("Authorization");


        if(authHeader == null ||
                !authHeader.startsWith("Bearer ")){

            filterChain.doFilter(request,response);
            return;
        }


        String token = authHeader.substring(7);



        if(token.isBlank() || token.split("\\.").length != 3){
            filterChain.doFilter(request,response);
            return;
        }

        String email = jwtService.extractUsername(token);


        if(email != null &&
                SecurityContextHolder.getContext()
                        .getAuthentication() == null){


            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(email);


            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );


            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

        }


        filterChain.doFilter(request,response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String path = request.getServletPath();

        return path.startsWith("/api/auth")
                || (path.equals("/api/users")
                && request.getMethod().equals("POST"))
                || (path.startsWith("/api/joboffers")
                && request.getMethod().equals("GET"));
    }
}