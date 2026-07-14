package org.example.copilote.security;

import org.example.copilote.exception.AuthenticationFailedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SUBJECT_CLAIM = "sub";
    private static final String EXPIRATION_CLAIM = "exp";
    private static final String ISSUED_AT_CLAIM = "iat";

    private final ObjectMapper objectMapper;
    private final byte[] secretKey;
    private final long jwtExpirationMillis;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${security.jwt.secret:copilote-change-this-secret-key-in-production-1234567890}") String secret,
            @Value("${security.jwt.expiration:86400000}") long jwtExpirationMillis
    ) {
        this.objectMapper = objectMapper;
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
        this.jwtExpirationMillis = jwtExpirationMillis;
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(userDetails, Collections.emptyMap());
    }

    public String generateToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        long issuedAt = Instant.now().getEpochSecond();
        long expiration = Instant.now().plusMillis(jwtExpirationMillis).getEpochSecond();

        Map<String, Object> payload = new HashMap<>(extraClaims);
        payload.put(SUBJECT_CLAIM, userDetails.getUsername());
        payload.put(ISSUED_AT_CLAIM, issuedAt);
        payload.put(EXPIRATION_CLAIM, expiration);

        return buildToken(payload);
    }

    public String extractUsername(String token) {
        Map<String, Object> claims = parsePayload(token);
        return getRequiredStringClaim(claims, SUBJECT_CLAIM);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        Map<String, Object> claims = parsePayload(token);
        String username = getRequiredStringClaim(claims, SUBJECT_CLAIM);

        return username.equals(userDetails.getUsername()) && !isTokenExpired(claims);
    }

    private boolean isTokenExpired(Map<String, Object> claims) {
        return getRequiredLongClaim(claims, EXPIRATION_CLAIM) < Instant.now().getEpochSecond();
    }

    private String buildToken(Map<String, Object> payload) {
        String header = encode(toJsonBytes(Map.of("alg", "HS256", "typ", "JWT")));
        String body = encode(toJsonBytes(payload));
        String unsignedToken = header + "." + body;

        return unsignedToken + "." + sign(unsignedToken);
    }

    private Map<String, Object> parsePayload(String token) {
        String[] chunks = token.split("\\.");
        if (chunks.length != 3) {
            throw new AuthenticationFailedException("Invalid JWT token");
        }

        String unsignedToken = chunks[0] + "." + chunks[1];
        String expectedSignature = sign(unsignedToken);

        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                chunks[2].getBytes(StandardCharsets.UTF_8)
        )) {
            throw new AuthenticationFailedException("Invalid JWT signature");
        }

        try {
            byte[] decodedPayload = Base64.getUrlDecoder().decode(chunks[1]);
            String payloadJson = new String(decodedPayload, StandardCharsets.UTF_8);
            return objectMapper.readValue(payloadJson, Map.class);
        } catch (RuntimeException exception) {
            throw new AuthenticationFailedException("Invalid JWT payload");
        }
    }

    private String sign(String content) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGORITHM));
            byte[] signatureBytes = mac.doFinal(content.getBytes(StandardCharsets.UTF_8));

            return Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Unable to sign JWT token", exception);
        }
    }

    private byte[] toJsonBytes(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsBytes(body);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to serialize JWT content", exception);
        }
    }

    private String encode(byte[] content) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(content);
    }

    private String getRequiredStringClaim(Map<String, Object> claims, String claimName) {
        Object value = claims.get(claimName);

        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }

        throw new AuthenticationFailedException("Invalid JWT claim: " + claimName);
    }

    private long getRequiredLongClaim(Map<String, Object> claims, String claimName) {
        Object value = claims.get(claimName);

        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }

        if (value instanceof String stringValue && !stringValue.isBlank()) {
            try {
                return Long.parseLong(stringValue);
            } catch (NumberFormatException exception) {
                throw new AuthenticationFailedException("Invalid JWT claim: " + claimName);
            }
        }

        throw new AuthenticationFailedException("Invalid JWT claim: " + claimName);
    }
}
