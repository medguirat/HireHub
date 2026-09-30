package com.hirehub.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    /** HS256 needs a key of at least 256 bits. */
    public static final int MIN_SECRET_BYTES = 32;

    private final Key signingKey;
    private final long expirationMs;

    /**
     * The secret comes from JWT_SECRET (environment or .env). There is deliberately no default:
     * a key committed to the repository would let anyone forge login tokens.
     */
    public JwtService(@Value("${jwt.secret:}") String secret,
                      @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(decodeSecret(secret));
        this.expirationMs = expirationMs;
    }

    static byte[] decodeSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new InvalidJwtSecretException("JWT_SECRET is not set.");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret.trim());
        } catch (IllegalArgumentException e) {
            throw new InvalidJwtSecretException("JWT_SECRET is not valid base64.");
        }
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new InvalidJwtSecretException("JWT_SECRET is too short (" + bytes.length + " bytes); it must be at least "
                    + MIN_SECRET_BYTES + " bytes (256 bits).");
        }
        return bytes;
    }

    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}
