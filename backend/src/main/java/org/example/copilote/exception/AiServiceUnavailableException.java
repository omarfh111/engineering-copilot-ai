package org.example.copilote.exception;

/**
 * Raised when the FastAPI IA service cannot be reached or fails to answer
 * (network error, timeout, 5xx). Mapped to HTTP 503 by
 * {@link GlobalExceptionHandler} so internal details never leak to the client.
 */
public class AiServiceUnavailableException extends RuntimeException {

    public AiServiceUnavailableException(String message) {
        super(message);
    }
}
