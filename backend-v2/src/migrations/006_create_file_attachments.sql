-- 006_create_file_attachments.sql
-- File attachments for inquiries and orders

CREATE TABLE file_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  storage_key   VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size          INTEGER      NOT NULL CHECK (size > 0),
  related_id    UUID         NOT NULL,
  related_type  VARCHAR(20)  NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  uploaded_by   UUID         NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_attachments_related ON file_attachments (related_type, related_id);
