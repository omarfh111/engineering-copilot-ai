-- PostgreSQL migration for Sprint 3 repository audits.
-- The table already exists in local development databases, so Hibernate's
-- ddl-auto=update does not replace its original CHECK constraint.

ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_type_check;

ALTER TABLE analyses
    ADD CONSTRAINT analyses_type_check
    CHECK (type IN (
        'FULL_AUDIT',
        'SECURITY',
        'QUALITY',
        'ARCHITECTURE',
        'DOCUMENTATION',
        'TODO_GENERATION'
    ));
