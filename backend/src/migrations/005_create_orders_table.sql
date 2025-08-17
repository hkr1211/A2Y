-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(100) NOT NULL,
    specifications TEXT NOT NULL,
    special_requirements TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'production', 'shipped', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_confirmed_by ON orders(confirmed_by);
CREATE INDEX idx_orders_inquiry_id ON orders(inquiry_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();