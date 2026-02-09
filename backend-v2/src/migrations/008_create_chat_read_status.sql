-- 008_create_chat_read_status.sql
-- Track per-user read status for chat messages

CREATE TABLE chat_read_status (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id),
  related_id   UUID        NOT NULL,
  related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, related_type, related_id)
);
