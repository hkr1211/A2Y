-- 003_create_inquiries.sql

CREATE TABLE inquiries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number       VARCHAR(20)  NOT NULL UNIQUE,
  product_name         VARCHAR(200) NOT NULL,
  material_type        VARCHAR(100) NOT NULL,
  specifications       TEXT         NOT NULL,
  special_requirements TEXT,
  quantity             INTEGER      NOT NULL CHECK (quantity > 0),
  status               VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'published', 'quoted', 'converted', 'cancelled')),
  created_by           UUID         NOT NULL REFERENCES users(id),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_created_by ON inquiries (created_by);
CREATE INDEX idx_inquiries_status     ON inquiries (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
