-- Execute once on existing PostgreSQL databases after V20260725_01.
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_type_check;
ALTER TABLE analyses ADD CONSTRAINT analyses_type_check CHECK (type IN
  ('FULL_AUDIT','IMPACT','SECURITY','QUALITY','ARCHITECTURE','DOCUMENTATION','TODO_GENERATION'));
