-- 005_create_orders.sql

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         VARCHAR(20)   NOT NULL UNIQUE,
  inquiry_id           UUID          REFERENCES inquiries(id),
  product_name         VARCHAR(200)  NOT NULL,
  material_type        VARCHAR(100)  NOT NULL,
  specifications       TEXT          NOT NULL,
  special_requirements TEXT,
  unit_price           DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity             INTEGER       NOT NULL CHECK (quantity > 0),
  total_price          DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
  status               VARCHAR(20)   NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'rejected',
                                         'production', 'shipped', 'completed', 'cancelled')),
  created_by           UUID          NOT NULL REFERENCES users(id),
  confirmed_by         UUID          REFERENCES users(id),
  reject_reason        TEXT,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_created_by ON orders (created_by);
CREATE INDEX idx_orders_status     ON orders (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created_at ON orders (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_inquiry_id ON orders (inquiry_id) WHERE inquiry_id IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
