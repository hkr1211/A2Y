-- 004_create_quotations.sql

CREATE TABLE quotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID           NOT NULL REFERENCES inquiries(id),
  version       INTEGER        NOT NULL DEFAULT 1,
  unit_price    DECIMAL(12,2)  NOT NULL CHECK (unit_price >= 0),
  total_price   DECIMAL(12,2)  NOT NULL CHECK (total_price >= 0),
  delivery_days INTEGER        NOT NULL CHECK (delivery_days > 0),
  remarks       TEXT,
  is_withdrawn  BOOLEAN        NOT NULL DEFAULT FALSE,
  created_by    UUID           NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (inquiry_id, version)
);

-- Query quotation history by inquiry (latest version first)
CREATE INDEX idx_quotations_inquiry ON quotations (inquiry_id, version DESC);
