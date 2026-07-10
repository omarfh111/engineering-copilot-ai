package org.example.copilote.entity;

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
}
