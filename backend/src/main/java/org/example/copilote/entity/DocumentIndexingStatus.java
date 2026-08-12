package org.example.copilote.entity;

/** Tracks the external Qdrant side effect independently from PostgreSQL persistence. */
public enum DocumentIndexingStatus {
    PENDING,
    INDEXED,
    FAILED
}
