-- 009_create_notifications.sql
-- User notifications triggered by business events

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id),
  type         VARCHAR(30)  NOT NULL
               CHECK (type IN ('quotation_new', 'quotation_updated', 'quotation_withdrawn',
                               'order_new', 'order_confirmed', 'order_rejected',
                               'order_status_changed', 'chat_message')),
  title        VARCHAR(200) NOT NULL,
  content      TEXT,
  related_id   UUID,
  related_type VARCHAR(20)  CHECK (related_type IN ('inquiry', 'order')),
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
