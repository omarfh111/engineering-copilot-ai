CREATE TABLE IF NOT EXISTS audit_events (
    event_id BIGSERIAL PRIMARY KEY,
    actor_email VARCHAR(255),
    action VARCHAR(16) NOT NULL,
    request_path VARCHAR(512) NOT NULL,
    ip_address VARCHAR(64),
    status VARCHAR(16) NOT NULL,
    http_status INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_status ON audit_events (status);
