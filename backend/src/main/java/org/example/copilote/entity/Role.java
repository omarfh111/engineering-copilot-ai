package org.example.copilote.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role {
    ADMIN,
    MANAGER,
    DEVELOPER,
    ARCHITECT,
    QA,
    AUDITOR;

    public Role normalized() {
        return this;
    }

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}