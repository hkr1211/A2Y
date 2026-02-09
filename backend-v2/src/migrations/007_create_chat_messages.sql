-- 007_create_chat_messages.sql
-- Chat messages for inquiries and orders

CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_id   UUID        NOT NULL,
  related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  sender_id    UUID        NOT NULL REFERENCES users(id),
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_related ON chat_messages (related_type, related_id, created_at);
