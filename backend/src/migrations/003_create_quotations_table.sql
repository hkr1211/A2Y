-- 创建报价表
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    delivery_time INTEGER NOT NULL CHECK (delivery_time > 0),
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_quotations_inquiry_id ON quotations(inquiry_id);
CREATE INDEX idx_quotations_created_by ON quotations(created_by);
CREATE INDEX idx_quotations_status ON quotations(status);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_quotations_updated_at();

-- 确保每个询单只能有一个活跃的报价
CREATE UNIQUE INDEX idx_quotations_unique_active_per_inquiry 
ON quotations(inquiry_id) 
WHERE status = 'active';