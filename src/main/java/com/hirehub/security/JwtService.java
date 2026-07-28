package com.hirehub.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    // La valeur par defaut ci-dessous permet de demarrer meme si application.properties
    // ne definit pas jwt.secret. En prod, definis la propriete jwt.secret (ou la variable
    // d'env JWT_SECRET si tu utilises ${JWT_SECRET:...} dans application.properties)
    // pour ne pas dependre de ce defaut.
    @Value("${jwt.secret:VGhpc0lzQVN1cGVyU2VjcmV0S2V5Rm9ySldUSFMjNTZBbmRJdE11c3RCZUF0TGVhc3QyNTZCaXRz}")
    private String secretKey;

    @Value("${jwt.expiration-ms:3600000}")
    private long expirationMs;

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}