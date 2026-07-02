package org.example.copilote.entity;

public enum Role {
    ADMIN,
    MANAGER,
    DEVELOPER,
    ARCHITECT,
    QA,
    AUDITOR;

    public Role normalized() {
        if (this == AUDITOR) {
            return MANAGER;
        }

        return this;
    }
}
