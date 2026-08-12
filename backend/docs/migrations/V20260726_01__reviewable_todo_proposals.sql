-- Sprint 3 human-in-the-loop integrity migration (PostgreSQL).
-- Run once after the 20260725 analysis-type migrations, before enabling a
-- production profile with ddl-auto=validate.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS finding_key VARCHAR(180);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS finding_id BIGINT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_user_id BIGINT;

UPDATE reviews review
SET finding_id = finding.finding_id
FROM analysis_findings finding
WHERE review.analysis_id = finding.analysis_id
  AND review.finding_key = finding.finding_key
  AND review.finding_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_finding') THEN
        ALTER TABLE reviews ADD CONSTRAINT fk_reviews_finding
            FOREIGN KEY (finding_id) REFERENCES analysis_findings(finding_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_reviewer_user') THEN
        ALTER TABLE reviews ADD CONSTRAINT fk_reviews_reviewer_user
            FOREIGN KEY (reviewer_user_id) REFERENCES users(id);
    END IF;
END $$;

-- Keep only the latest historical decision before enforcing one current
-- decision per finding. Generic reviews without a finding key are unaffected.
DELETE FROM reviews older
USING reviews newer
WHERE older.review_id < newer.review_id
  AND older.analysis_id = newer.analysis_id
  AND older.finding_key = newer.finding_key
  AND older.finding_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_analysis_finding
    ON reviews (analysis_id, finding_key)
    WHERE finding_key IS NOT NULL;

ALTER TABLE todos ADD COLUMN IF NOT EXISTS origin_finding_id BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(30);
UPDATE documents SET indexing_status = 'INDEXED' WHERE indexing_status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_todos_origin_finding
    ON todos (origin_finding_id)
    WHERE origin_finding_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_todos_origin_finding') THEN
        ALTER TABLE todos ADD CONSTRAINT fk_todos_origin_finding
            FOREIGN KEY (origin_finding_id) REFERENCES analysis_findings(finding_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS todo_proposals (
    proposal_id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL REFERENCES analyses(analysis_id),
    finding_id BIGINT NOT NULL REFERENCES analysis_findings(finding_id),
    title VARCHAR(220) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(40) NOT NULL,
    generated_by BIGINT REFERENCES users(id),
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_todo_proposals_analysis_finding UNIQUE (analysis_id, finding_id),
    CONSTRAINT todo_proposals_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT todo_proposals_status_check CHECK (status IN ('PENDING_CONFIRMATION', 'CONFIRMED'))
);
