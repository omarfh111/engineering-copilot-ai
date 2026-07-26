package org.example.copilote.dto.Response;

/** Binary file data served only after the owning document access check. */
public record DocumentFileResponse(byte[] content, String filename, String contentType) {
}
