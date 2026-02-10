-- 010_create_audit_logs.sql
-- Audit logs for tracking all business operations

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id   UUID,
  summary     TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user   ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
